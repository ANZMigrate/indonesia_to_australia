/* Secure plain-text email delivery for the five-field contact form. */
import { readFileSync } from 'node:fs';
import nodemailer from 'nodemailer';

const schema = JSON.parse(readFileSync(new URL('../contact-schema.json', import.meta.url), 'utf8'));
const countries = (schema.fields.find(field => field.key === 'country')?.options || [])
  .filter(option => option && /^[A-Z]{2}$/.test(option.value));
const allowedCountries = new Set(countries.map(option => option.value));
const LIMIT = 12000;
const keys = new Set(['name','email','phone','country','additionalNotes','consent','companyWebsite']);
const validEmail = value => typeof value === 'string' &&
  /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value.trim());

function smtpReady() {
  const vars = ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM_EMAIL','CONTACT_TO_EMAIL'];
  if (!vars.every(key => typeof process.env[key] === 'string' && process.env[key].trim())) {
    return false;
  }
  if (![465,587].includes(Number(process.env.SMTP_PORT))) return false;
  return validEmail(process.env.SMTP_FROM_EMAIL) &&
    validEmail(process.env.CONTACT_TO_EMAIL);
}

function reply(res,status,body) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.status(status).json(body);
}

function validate(payload) {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const phone = typeof payload.phone === 'string' ? payload.phone.trim() : '';
  const country = payload.country;
  const additionalNotes = typeof payload.additionalNotes === 'string' ?
    payload.additionalNotes.trim() : payload.additionalNotes === undefined ? '' : null;

  if (name.length < 2 || name.length > 150 || /[\r\n]/.test(name)) {
    return {error:'Please enter your name (2–150 characters).'};
  }
  if (!validEmail(email) || email.length > 254 || /[\r\n]/.test(email)) {
    return {error:'Please enter a valid email address.'};
  }
  if (!/^\+?[\d ()-]{6,32}$/.test(phone)) {
    return {error:'Please enter a valid phone number.'};
  }
  const digits = phone.replace(/\D/g,'').length;
  if (digits < 6 || digits > 16) return {error:'Please enter a valid phone number.'};
  if (!allowedCountries.has(country)) return {error:'Please select your country of residence.'};
  if (additionalNotes === null || additionalNotes.length > 2000) {
    return {error:'Additional notes must be 2000 characters or fewer.'};
  }
  if (payload.consent !== true) return {error:'Privacy consent is required.'};
  return {value:{name,email,phone,country,additionalNotes}};
}

export default async function handler(req,res) {
  if (req.method === 'GET') {
    return reply(res,200,{ok:true,submissionReady:smtpReady(),countries});
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow','GET, POST');
    return reply(res,405,{ok:false,error:'Method not allowed.'});
  }
  if (!String(req.headers['content-type']||'').startsWith('application/json')) {
    return reply(res,415,{ok:false,error:'JSON is required.'});
  }
  if (Number(req.headers['content-length']||0) > LIMIT) {
    return reply(res,413,{ok:false,error:'The enquiry is too large.'});
  }
  const siteHost = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  if (req.headers.origin) {
    let originHost;
    try { originHost = new URL(req.headers.origin).host; }
    catch { return reply(res,403,{ok:false,error:'Invalid request origin.'}); }
    if (siteHost && originHost !== siteHost) {
      return reply(res,403,{ok:false,error:'Cross-site requests are not accepted.'});
    }
  }
  const payload = req.body && typeof req.body === 'object' &&
    !Array.isArray(req.body) ? req.body : null;
  if (!payload || JSON.stringify(payload).length > LIMIT ||
      Object.keys(payload).some(key => !keys.has(key))) {
    return reply(res,400,{ok:false,error:'Invalid enquiry data.'});
  }
  // Silently drop likely spam. This field is hidden from ordinary visitors.
  if (String(payload.companyWebsite || '').trim()) return reply(res,200,{ok:true});
  const result = validate(payload);
  if (result.error) return reply(res,400,{ok:false,error:result.error});
  if (!smtpReady()) {
    return reply(res,503,{ok:false,error:'Email delivery is temporarily unavailable.'});
  }
  const {name,email,phone,country,additionalNotes} = result.value;
  const countryLabel = countries.find(option => option.value === country)?.label || country;
  const message = [
    'New Indonesia to Australia website enquiry',
    '',
    'Name: ' + name,
    'Email: ' + email,
    'Phone number: ' + phone,
    'Country of residence: ' + countryLabel,
    '',
    'Additional notes:',
    additionalNotes || '(None provided)',
    '',
    'Privacy consent: Yes'
  ].join('\n');
  const port = Number(process.env.SMTP_PORT);
  const transporter = nodemailer.createTransport({
    host:process.env.SMTP_HOST,
    port,
    secure:port === 465,
    requireTLS:port === 587,
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
      replyTo:email,
      subject:'New enquiry — Indonesia to Australia',
      text:message
    });
    // SMTP server acceptance is not guaranteed final inbox delivery.
    const recipient = process.env.CONTACT_TO_EMAIL.trim().toLowerCase();
    const accepted = (receipt.accepted || []).some(address =>
      String(address).trim().toLowerCase() === recipient);
    if (!accepted || !receipt.messageId) {
      return reply(res,502,{ok:false,error:'Email delivery could not be confirmed. Please try again later.'});
    }
    return reply(res,200,{ok:true});
  } catch {
    return reply(res,502,{ok:false,error:'Unable to send your enquiry right now. Please try again later.'});
  }
}
