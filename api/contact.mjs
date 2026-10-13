/* Indonesia contact relay. This file contains no tokens from the supplied JSON. */
import { readFileSync } from 'node:fs';
import { evaluateForm, collectAllowedAnswers } from '../contact-rules.mjs';

const schema = JSON.parse(readFileSync(new URL('../contact-schema.json', import.meta.url), 'utf8'));
const fields = schema.fields || [];
const countries = fields.find(f => f.key === 'country')?.options || [];
const LIMIT = 24000;

function reply(res, status, data) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(status).json(data);
}
function isEmpty(value) {
  return value === undefined || value === null || value === '' ||
    value === false || (Array.isArray(value) && value.length === 0);
}
function validDate(value, requirePast) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value &&
    (!requirePast || (date <= new Date() && Number(value.slice(0,4)) >= 1900));
}
function validate(field, value, allowed) {
  if (field.required && isEmpty(value)) return 'Please complete: ' + field.label;
  if (isEmpty(value)) return null;
  if (field.type === 'checkbox') return typeof value === 'boolean' ? null : 'Invalid checkbox data.';
  if (field.type === 'multi-select') {
    if (!Array.isArray(value) || value.length > 40) return 'Invalid multiple-choice answer.';
  } else if (typeof value !== 'string' || value.length > (field.type === 'textarea' ? 1000 : 500)) {
    return 'Invalid text value for ' + field.label;
  }
  const values = Array.isArray(value) ? value : [value];
  if (['country','select','radio','multi-select'].includes(field.type)) {
    const options = field.type === 'country' && !field.options?.length ? countries : field.options || [];
    const permissible = new Set(options.map(o => o.value));
    if (values.some(v => !permissible.has(v) || allowed?.[v] === false)) {
      return 'Invalid selection for ' + field.label;
    }
  }
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email.';
  if (field.type === 'tel' && !/^\+?[\d ()-]{6,32}$/.test(value)) return 'Enter a valid phone number.';
  if (field.type === 'number' && (!/^\d+$/.test(value) || value.length > 18)) return 'Enter a valid number.';
  if (field.type === 'date' && !validDate(value,['yourDateOfBirth','partnerDateOfBirth'].includes(field.key))) {
    return 'Enter a valid date for ' + field.label;
  }
  return null;
}
export default async function handler(req,res) {
  if (req.method === 'GET') return reply(res,200,{ok:true,formId:schema.id,
    fieldCount:fields.length,conditionCount:schema.conditions.length,
    submissionReady:Boolean(process.env.CONTACT_SUBMIT_ENDPOINT && process.env.CONTACT_SUBMIT_HOST),
    updatedAt:schema.updatedAt});
  if (req.method !== 'POST') {
    res.setHeader('Allow','GET, POST');
    return reply(res,405,{ok:false,error:'Method not allowed.'});
  }
  if (!String(req.headers['content-type']||'').startsWith('application/json')) {
    return reply(res,415,{ok:false,error:'JSON is required.'});
  }
  if (Number(req.headers['content-length']||0)>LIMIT) {
    return reply(res,413,{ok:false,error:'The enquiry is too large.'});
  }
  const siteHost = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (req.headers.origin) {
    let originHost;
    try { originHost = new URL(req.headers.origin).host; }
    catch { return reply(res,403,{ok:false,error:'Invalid request origin.'}); }
    if (siteHost && siteHost !== originHost) return reply(res,403,{ok:false,error:'Cross-site requests are not accepted.'});
  }
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null;
  if (!body || Object.keys(body).length > 65 || JSON.stringify(body).length > LIMIT) {
    return reply(res,400,{ok:false,error:'Malformed enquiry data.'});
  }
  if (String(body.companyWebsite||'').trim()) return reply(res,200,{ok:true});
  if (body.consent !== true) return reply(res,400,{ok:false,error:'Privacy consent is required.'});
  const answers = collectAllowedAnswers(schema,body);
  const { visible,optionVisibility }=evaluateForm(schema,answers);
  const submissionData=[];
  for (const field of fields) {
    if (visible[field.key] === false) continue;
    const value = answers[field.key];
    const error = validate(field,value,optionVisibility[field.key]);
    if (error) return reply(res,400,{ok:false,error});
    if (!isEmpty(value)) submissionData.push({field:field.key,value});
  }
  // No automatic routing to a previous provider. The site operator must
  // explicitly configure a trusted, HTTPS receiving service and its exact host.
  if (!process.env.CONTACT_SUBMIT_ENDPOINT || !process.env.CONTACT_SUBMIT_HOST) {
    return reply(res,503,{ok:false,error:'Online enquiries are not configured yet.'});
  }
  let url;
  try {
    url = new URL(process.env.CONTACT_SUBMIT_ENDPOINT);
    if (url.protocol !== 'https:' || url.hostname !== process.env.CONTACT_SUBMIT_HOST ||
        url.username || url.password || url.port || url.hash) throw new Error('Invalid endpoint');
  } catch { return reply(res,503,{ok:false,error:'The receiving service configuration is invalid.'}); }
  const mode = process.env.CONTACT_SUBMIT_FORMAT || 'payload';
  if (!['payload','convert'].includes(mode)) return reply(res,503,{ok:false,error:'Invalid submission format.'});
  const payload = mode === 'payload'
    ? { form:schema.id,submissionData }
    : { formId:schema.id,data:Object.fromEntries(submissionData.map(item=>[item.field,item.value])) };
  const controller = new AbortController();
  const timeout = setTimeout(()=>controller.abort(),13000);
  try {
    const response = await fetch(url.toString(),{
      method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify(payload),signal:controller.signal
    });
    if (!response.ok) return reply(res,502,{ok:false,error:'The receiving service did not accept the enquiry. Please try again later.'});
    const receipt = await response.json().catch(()=>null);
    if (!receipt || receipt.errors || receipt.error || receipt.success===false ||
      !(receipt.success===true || receipt.doc?.id || receipt.id)) {
      return reply(res,502,{ok:false,error:'The receiving service did not confirm the enquiry. Please try again later.'});
    }
    return reply(res,200,{ok:true});
  } catch {
    return reply(res,502,{ok:false,error:'The receiving service could not be reached. Please try again later.'});
  } finally { clearTimeout(timeout); }
}
