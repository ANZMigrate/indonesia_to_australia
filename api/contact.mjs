/* Vercel Node serverless function.
 * The official published form configuration is the source of field names.
 * Do not log request bodies, store PII, or signal success unless upstream
 * acknowledges the submission.
 */
'use strict';

const FORM_URL = 'https://www.anzmigrate.com/api/convert-forms/1?depth=2&draft=false&locale=undefined&trash=false';
const DEFAULT_SUBMIT_URL = 'https://www.anzmigrate.com/api/form-submissions';
const MAX_LENGTH = 20_000;

const key = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const fieldsOf = (schema) => {
  const fields = [];
  const visited = new WeakSet();
  function visit(value, depth = 0) {
    if (!value || typeof value !== 'object' || depth > 8 || visited.has(value) || fields.length > 160) return;
    visited.add(value);
    if (Array.isArray(value)) {
      value.forEach(item => visit(item, depth + 1));
      return;
    }
    if (typeof value.name === 'string' && value.name.length < 120 &&
        (typeof value.label === 'string' || typeof value.blockType === 'string' || typeof value.type === 'string')) {
      fields.push(value);
    }
    for (const [property, child] of Object.entries(value)) {
      if (['fields','blocks','formFields','layout','tabs','rows','columns','children'].includes(property)) visit(child, depth + 1);
    }
  }
  visit(schema);
  return fields;
};

const aliases = {
  firstName: ['firstname','givenname','first'],
  lastName: ['lastname','familyname','surname','last'],
  email: ['email','emailaddress'],
  country: ['country','countryofresidence','currentcountry'],
  phone: ['phone','phonenumber','contactnumber','mobile','telephone'],
  phoneCode: ['phonecode','dialcode','countrycode','phonecountrycode'],
  interestedIn: ['interestedin','destination','migrationdestination','interestedcountry','immigrationcountry'],
  visaFor: ['visafor','wantavisafor','visatype','purpose','visapurpose','applicationtype'],
  dateOfBirth: ['dateofbirth','dob','birthdate','yourdateofbirth'],
  details: ['details','additionaldetails','message','otherdetails','notes','comments','otherrelevantdetails'],
  occupation: ['occupation','jobtitle','currentoccupation'],
  experience: ['experience','yearsofexperience','workexperience'],
  relationship: ['relationship','relationshipstatus'],
  sponsorStatus: ['sponsorstatus','sponsorvisastatus'],
  studyLevel: ['studylevel','intendedstudylevel'],
  studyStart: ['studystart','startdate','studyintake']
};

const pickField = (fields, name) => {
  const targets = aliases[name] || [key(name)];
  let result = fields.find(field => targets.includes(key(field.name)));
  if (result) return result;
  result = fields.find(field => targets.includes(key(field.label)));
  if (result) return result;
  return fields.find(field => targets.some(alias =>
    key(field.label).startsWith(alias) || key(field.name).startsWith(alias)
  )) || null;
};

function matchOption(field, value) {
  if (!Array.isArray(field.options) || !field.options.length) return value;
  const needle = key(value);
  const options = field.options.map(option => {
    if (typeof option === 'string') return { label: option, value: option };
    return { label: String(option.label || option.value || ''), value: String(option.value ?? option.label ?? '') };
  });
  const exact = options.find(option => key(option.value) === needle || key(option.label) === needle);
  if (exact) return exact.value;
  const similar = options.find(option => needle.length > 3 && (key(option.label).includes(needle) || needle.includes(key(option.label))));
  return similar ? similar.value : value;
}

async function readConfig() {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 8000);
  try {
    const response = await fetch(FORM_URL, { signal: abort.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('The official form configuration is unavailable.');
    const schema = await response.json();
    if (!schema || typeof schema !== 'object' || !schema.id) throw new Error('Unexpected form configuration.');
    return schema;
  } finally { clearTimeout(timer); }
}

const respond = (res, status, body) => {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  return res.status(status).json(body);
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const schema = await readConfig();
      return respond(res, 200, { ok: true, formId: schema.id,
        fields: fieldsOf(schema).map(field => ({ name: field.name, label: field.label || field.name, required: !!field.required })) });
    } catch (error) {
      return respond(res, 502, { ok: false, error: 'The official form configuration could not be loaded.' });
    }
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return respond(res, 405, { ok: false, error: 'Method not allowed.' });
  }
  const size = Number(req.headers['content-length'] || 0);
  if (size > MAX_LENGTH) return respond(res, 413, { ok: false, error: 'The enquiry is too large.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    return respond(res, 415, { ok: false, error: 'Only JSON enquiries are accepted.' });
  }
  let parsed;
  try { parsed = req.body; }
  catch { return respond(res, 400, { ok: false, error: 'Invalid JSON request.' }); }
  const data = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  if (!data || typeof data !== 'object') return respond(res, 400, { ok: false, error: 'Invalid form data.' });
  if (Object.keys(data).length > 40 || JSON.stringify(data).length > MAX_LENGTH) {
    return respond(res, 413, { ok: false, error: 'The enquiry is too large.' });
  }
  // Bot trap, deliberately display the same success without delivering.
  if (String(data.companyWebsite || '').trim()) return respond(res, 200, { ok: true });
  const firstName = String(data.firstName || '').trim();
  const lastName = String(data.lastName || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const country = String(data.country || '').trim();
  const destination = String(data.interestedIn || '');
  const route = String(data.visaFor || '');
  const dob = String(data.dateOfBirth || '');
  if (!data.consent || !firstName || !lastName || !country || !phone || !route ||
      !['Australia','New Zealand'].includes(destination) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dob) ||
      [firstName,lastName,email,phone,country].some(value => value.length > 254) ||
      String(data.details || '').length > 3000) {
    return respond(res, 400, { ok: false, error: 'Please complete all required details with valid values.' });
  }
  const date = new Date(dob + 'T00:00:00Z');
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0,10) !== dob || date > new Date() ||
      Number(dob.slice(0,4)) < 1900) {
    return respond(res, 400, { ok: false, error: 'Please enter a valid date of birth.' });
  }
  const routeLabels = {
    skilled:'Skilled migration / permanent residence',
    employment:'Work / employer sponsored visa',
    innovation:'National Innovation / talent visa',
    study:'Study / student visa',
    partner:'Partner / spouse visa',
    family:'Parent / family visa',
    business:'Business / investment visa',
    other:'Other visa / not sure'
  };
  if (!Object.hasOwn(routeLabels, route)) return respond(res, 400, { ok: false, error: 'Please select your visa interest.' });

  let schema;
  try { schema = await readConfig(); }
  catch (error) {
    return respond(res, 503, { ok: false, error: 'The enquiry service is temporarily unavailable. Please use the official ANZ Migrate contact page.' });
  }
  const fields = fieldsOf(schema);
  if (!fields.length) return respond(res, 503, { ok: false, error: 'The upstream form structure could not be verified. Please use the official contact page.' });

  const notes = [
    String(data.details || '').trim(),
    'Enquiry source: Indonesia to Australia website',
    'Visa interest: ' + routeLabels[route],
    ...['occupation','experience','relationship','sponsorStatus','studyLevel','studyStart']
      .filter(name => data[name] && !pickField(fields,name))
      .map(name => name + ': ' + String(data[name]).slice(0,200))
  ].filter(Boolean).join('\n');
  const values = {
    firstName, lastName, email, country,
    phone: (String(data.phoneCode || '+62') + ' ' + phone).trim(),
    phoneCode: String(data.phoneCode || '+62'),
    interestedIn: destination,
    visaFor: routeLabels[route],
    dateOfBirth: dob,
    details: notes,
    occupation: String(data.occupation || ''),
    experience: String(data.experience || ''),
    relationship: String(data.relationship || ''),
    sponsorStatus: String(data.sponsorStatus || ''),
    studyLevel: String(data.studyLevel || ''),
    studyStart: String(data.studyStart || '')
  };
  const submissionData = [];
  const matched = new Set();
  for (const [name,value] of Object.entries(values)) {
    const field = pickField(fields,name);
    if (!field || value === '' || matched.has(field.name)) continue;
    matched.add(field.name);
    submissionData.push({ field: field.name, value: matchOption(field,value) });
  }
  // Fail closed if we cannot map the core information to actual upstream fields.
  for (const name of ['firstName','lastName','email','phone','interestedIn','visaFor','dateOfBirth']) {
    const field = pickField(fields,name);
    if (!field || !matched.has(field.name)) {
      return respond(res, 503, { ok: false, error: 'The official form fields have changed. Please complete your enquiry on the main ANZ Migrate website.' });
    }
  }
  const configuredEndpoint = process.env.ANZMIGRATE_SUBMIT_ENDPOINT || DEFAULT_SUBMIT_URL;
  let endpoint;
  try {
    endpoint = new URL(configuredEndpoint);
    if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'www.anzmigrate.com') throw new Error('Invalid endpoint');
  } catch {
    return respond(res, 503, { ok: false, error: 'The enquiry service is not configured.' });
  }
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 13000);
  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ form: schema.id, submissionData }),
      signal: abort.signal
    });
    // Do not leak raw upstream errors, personal data, or any internal API details.
    if (!upstream.ok) return respond(res, 502, { ok: false, error: 'The ANZ Migrate form service did not accept this enquiry. Please use their official contact form.' });
    const response = await upstream.json().catch(() => null);
    if (!response || response.errors || response.error || response.success === false ||
        !(response.success === true || response.doc?.id || response.id)) {
      return respond(res, 502, { ok: false, error: 'Enquiry receipt could not be confirmed. Please use the official contact form.' });
    }
    return respond(res, 200, { ok: true });
  } catch {
    return respond(res, 502, { ok: false, error: 'Could not reach the ANZ Migrate enquiry service. Please try their official contact page.' });
  } finally { clearTimeout(timer); }
};
