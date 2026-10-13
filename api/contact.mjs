/* Indonesia contact relay. This file contains no tokens from the supplied JSON. */
import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';
import { evaluateForm, collectAllowedAnswers } from '../contact-rules.mjs';

const schema = JSON.parse(readFileSync(new URL('../contact-schema.json', import.meta.url), 'utf8'));
const fields = schema.fields || [];
const countries = fields.find(f => f.key === 'country')?.options || [];
const LIMIT = 24000;

function smtpReady() {
  const keys=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM_EMAIL','CONTACT_TO_EMAIL'];
  if (!keys.every(key => typeof process.env[key] === 'string' && process.env[key].trim())) return false;
  if (![465,587].includes(Number(process.env.SMTP_PORT))) return false;
  const validEmail = s => /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(s.trim());
  return validEmail(process.env.SMTP_FROM_EMAIL) && validEmail(process.env.CONTACT_TO_EMAIL);
}

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
    submissionReady:smtpReady(),
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
  if (!smtpReady()) {
    return reply(res,503,{ok:false,error:'Email delivery is temporarily unavailable.'});
  }
  const lines = [
    'New Indonesia to Australia visa enquiry',
    '',
    ...submissionData.map(({field,value}) => {
      const definition = fields.find(item => item.key === field);
      const label = (definition?.label || field).replace(/[\r\n]/g,' ');
      const answer = Array.isArray(value) ? value.join(', ') :
        value === true ? 'Yes' : value === false ? 'No' : String(value);
      return label + ': ' + answer;
    }),
    '',
    'Privacy consent: Yes',
    'Source: Indonesia to Australia enquiry form'
  ];
  const port = Number(process.env.SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port,
    secure:port===465,
    requireTLS:port===587,
    auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},
    tls:{minVersion:'TLSv1.2'},
    connectionTimeout:10000,
    greetingTimeout:10000,
    socketTimeout:12000,
    disableFileAccess:true,
    disableUrlAccess:true
  });
  try {
    const receipt = await transporter.sendMail({
      from:{name:'Indonesia to Australia Enquiries',address:process.env.SMTP_FROM_EMAIL},
      to:process.env.CONTACT_TO_EMAIL,
      replyTo:String(answers.email).trim(),
      subject:'New visa enquiry — Indonesia to Australia',
      text:lines.join('\n')
    });
    // SMTP acceptance is handoff to the receiving mail server, not inbox delivery.
    const recipient=process.env.CONTACT_TO_EMAIL.trim().toLowerCase();
    const accepted=(receipt.accepted||[]).some(mail=>
      String(mail).trim().toLowerCase()===recipient);
    if (!accepted || !receipt.messageId) {
      return reply(res,502,{ok:false,error:'Email acceptance could not be confirmed. Please try again later.'});
    }
    return reply(res,200,{ok:true});
  } catch {
    // No raw SMTP errors, credentials, or submitted personal data in responses.
    return reply(res,502,{ok:false,error:'Unable to send your enquiry right now. Please try again later.'});
  }
}
