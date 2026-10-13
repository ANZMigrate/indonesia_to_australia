import { evaluateForm } from './contact-rules.mjs';

/* ANZ Migrate — Indonesia satellite contact intake.
 * Field definitions, options and all enabled show/hide rules come from the
 * supplied (redacted) contact-schema.json. GSAP remains independent.
 */
const form = document.getElementById('visa-contact-form');
if (form) {
  const mount = document.getElementById('contact-dynamic-fields');
  const consent = document.getElementById('contact-consent');
  const submit = form.querySelector('button[type="submit"]');
  const status = document.getElementById('contact-form-status');
  const originalButton = submit.innerHTML;
  const officialUrl = 'https://www.anzmigrate.com/contact';
  let schema = null;
  let state = { visible: {}, optionVisibility: {} };
  let sending = false;

  const dialing = [
    ['AU +61','+61'],['ID +62','+62'],['SG +65','+65'],['NZ +64','+64'],
    ['MY +60','+60'],['HK +852','+852'],['VN +84','+84'],['IN +91','+91'],
    ['TH +66','+66'],['PH +63','+63'],['UK +44','+44'],['US +1','+1']
  ];
  const make = (tag, cls = '', content = '') => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (content) el.textContent = content;
    return el;
  };
  const announce = (message, kind='error') => {
    status.hidden = false;
    status.dataset.state = kind;
    status.textContent = message;
  };
  const clearNotice = () => { status.hidden = true; status.textContent = ''; };
  const optional = (value) => value == null ? '' : String(value);

  function buildField(field, countries) {
    const key = field.key;
    const type = field.type;
    const id = 'intake-' + key;
    const radioGroup = type === 'radio' || type === 'multi-select';
    const shell = make(radioGroup ? 'fieldset' : 'div', 'form-field');
    shell.dataset.key = key;
    shell.dataset.width = field.width === '50' ? '50' : '100';
    if (radioGroup) shell.classList.add('form-choice');
    const title = make(radioGroup ? 'legend' : 'label', '', field.label);
    if (!radioGroup && type !== 'checkbox') title.htmlFor = id;
    if (field.required) {
      const star = make('span', '', ' *');
      star.setAttribute('aria-hidden','true');
      title.append(star);
    }

    let options = field.options || [];
    if (type === 'country' && !options.length) options = countries;
    const selectWithOptions = (select, list) => {
      select.append(new Option('Select an option', ''));
      for (const item of list) select.append(new Option(item.label, item.value));
    };
    if (type === 'radio' || type === 'multi-select') {
      shell.append(title);
      const choices = make('div', type === 'radio' ? 'choice-row' : 'multi-options');
      for (const item of options) {
        const choice = make('label', type === 'radio' ? 'choice-pill' : 'form-checkbox-label');
        const input = make('input');
        input.type = type === 'radio' ? 'radio' : 'checkbox';
        input.name = key;
        input.value = item.value;
        const span = make('span', '', item.label);
        choice.append(input,span);
        choices.append(choice);
      }
      shell.append(choices);
    } else if (type === 'checkbox') {
      const choice = make('label','form-checkbox-label');
      const input = make('input');
      input.type = 'checkbox'; input.name = key; input.value = 'Yes'; input.id = id;
      const text = make('span', '', field.label);
      if (field.required) text.append(make('span','', ' *'));
      choice.append(input, text);
      shell.append(choice);
    } else {
      shell.append(title);
      let input;
      if (type === 'select' || type === 'country') {
        input = make('select');
        selectWithOptions(input,options);
      } else if (type === 'textarea') {
        input = make('textarea');
        input.rows = 5; input.maxLength = 1000;
        input.placeholder = optional(field.placeholder || 'Tell us about your circumstances or questions.');
      } else {
        input = make('input');
        input.type = ['email','date','number','tel','file'].includes(type) ? type : 'text';
        if (field.placeholder) input.placeholder = field.placeholder;
        if (type === 'date' && ['yourDateOfBirth','partnerDateOfBirth'].includes(key)) {
          const today = new Date();
          input.max = [today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
        }
        if (type === 'number') input.inputMode = 'numeric';
        if (type === 'tel') input.inputMode = 'tel';
        if (type === 'file') {
          if (field.accept) input.accept = field.accept;
          input.multiple = !!field.allowMultiple;
        }
        if (type === 'text' || type === 'email' || type === 'tel') input.maxLength = 250;
      }
      input.id = id;
      input.name = key;
      if (key === 'firstName') input.autocomplete = 'given-name';
      if (key === 'lastName') input.autocomplete = 'family-name';
      if (key === 'email') input.autocomplete = 'email';
      if (key === 'country') input.autocomplete = 'country';
      if (key === 'yourDateOfBirth') input.autocomplete = 'bday';
      if (type === 'tel') {
        const group = make('div','phone-group');
        const dial = make('select');
        dial.id = 'intake-dial-code'; dial.setAttribute('aria-label','International dialing code');
        dialing.forEach(([label,value])=> dial.append(new Option(label,value)));
        dial.value = '+61';
        group.append(dial,input);
        shell.append(group);
      } else {
        shell.append(input);
      }
    }
    if (field.helpText) shell.append(make('span','field-hint',field.helpText));
    if (type === 'file') {
      const note = make('span','contact-upload-note',
        'Documents cannot yet be forwarded securely through this satellite site. If you need to attach documents, use the official ANZ Migrate form.');
      shell.append(note);
      const link = make('a','text-link','Open official upload form');
      link.href = officialUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
      shell.append(link);
    }
    return shell;
  }

  function selectedValues() {
    const data = {};
    if (!schema) return data;
    schema.fields.forEach(field => {
      const shell = mount.querySelector('[data-key="' + field.key + '"]');
      if (!shell || shell.hidden) return;
      const inputs = [...shell.querySelectorAll('input,select,textarea')].filter(el => !el.disabled && el.name === field.key);
      if (field.type === 'radio') {
        data[field.key] = inputs.find(input => input.checked)?.value || '';
      } else if (field.type === 'multi-select') {
        data[field.key] = inputs.filter(input => input.checked).map(input => input.value);
      } else if (field.type === 'checkbox') {
        data[field.key] = !!inputs[0]?.checked;
      } else if (field.type === 'file') {
        data[field.key] = [...(inputs[0]?.files || [])].map(file => file.name);
      } else {
        data[field.key] = inputs[0]?.value || '';
      }
    });
    return data;
  }

  function updateVisibility() {
    if (!schema) return;
    // Cascading visibility is recalculated until a changed parent answer has
    // hidden and cleared its downstream dependents.
    for (let attempt = 0; attempt < 15; attempt++) {
      state = evaluateForm(schema,selectedValues());
      let changed = false;
      schema.fields.forEach(field => {
        const shell = mount.querySelector('[data-key="' + field.key + '"]');
        if (!shell) return;
        const show = state.visible[field.key] !== false;
        const inputs = [...shell.querySelectorAll('input,select,textarea')];
        if (shell.hidden === show) {
          shell.hidden = !show;
          changed = true;
          if (!show) {
            for (const input of inputs) {
              if (input.type === 'checkbox' || input.type === 'radio') input.checked = false;
              else input.value = '';
            }
          }
        }
        inputs.forEach(input => {
          input.disabled = !show;
          input.required = show && !!field.required && !['radio','checkbox','multi-select','file'].includes(field.type) && input.name === field.key;
        });
        const allowed = state.optionVisibility[field.key] || {};
        shell.querySelectorAll('option, input[type="radio"], input[type="checkbox"]').forEach(control => {
          if (control.name && control.name !== field.key) return;
          if (!(control.value in allowed)) return;
          const permitted = allowed[control.value] !== false;
          control.disabled = !show || !permitted;
          if (control.tagName === 'OPTION') {
            control.hidden = !permitted;
            if (!permitted && control.selected) {
              control.parentElement.value = '';
              changed = true;
            }
          } else {
            if (control.parentElement) control.parentElement.hidden = !permitted;
            if (!permitted && control.checked) {
              control.checked = false; changed = true;
            }
          }
        });
      });
      if (!changed) break;
    }
  }

  function invalidField(field, value) {
    if (field.type === 'file') return '';
    if (field.required) {
      const empty = Array.isArray(value) ? value.length === 0
        : field.type === 'checkbox' ? !value : !String(value || '').trim();
      if (empty) return 'This field is required.';
    }
    if (!value) return '';
    if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      return 'Enter a valid email address.';
    }
    if (['yourDateOfBirth','partnerDateOfBirth'].includes(field.key)) {
      const date = new Date(String(value) + 'T00:00:00Z');
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value ||
          date > new Date() || Number(String(value).slice(0,4)) < 1900) return 'Enter a valid past date.';
    }
    if (['date','number'].includes(field.type) && !String(value).trim()) return '';
    if (field.type === 'tel' && String(value).replace(/[^\d]/g,'').length < 6) return 'Enter a valid phone number.';
    return '';
  }

  async function submitForm(event) {
    event.preventDefault();
    if (!schema || sending) return;
    status.hidden = true;
    mount.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute('aria-invalid'));
    updateVisibility();
    const values = selectedValues();
    for (const field of schema.fields) {
      if (state.visible[field.key] === false) continue;
      const issue = invalidField(field, values[field.key]);
      if (issue) {
        const shell = mount.querySelector('[data-key="' + field.key + '"]');
        const control = shell.querySelector('input:not([type="hidden"]),select,textarea');
        if (control) {
          control.setAttribute('aria-invalid','true');
          control.focus({ preventScroll: true });
          control.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        announce(field.label + ': ' + issue);
        return;
      }
    }
    if (!consent.checked) {
      consent.focus();
      announce('Please read and agree to the privacy notice before sending.');
      return;
    }
    const hasFiles = schema.fields.some(field =>
      field.type === 'file' && state.visible[field.key] &&
      (values[field.key] || []).length > 0
    );
    if (hasFiles) {
      announce('Document uploads cannot be forwarded by this satellite form. Please submit your enquiry with attachments using the official ANZ Migrate contact form.');
      return;
    }
    const data = { ...values, consent:true,
      companyWebsite: form.querySelector('[name="companyWebsite"]').value };
    const phone = data.phone || '';
    if (phone) data.phone = (document.getElementById('intake-dial-code').value + ' ' + phone).trim();
    sending = true;
    submit.disabled = true;
    submit.textContent = 'Sending details…';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(),25000);
      let response;
      try {
        response = await fetch('/api/contact', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
          credentials:'same-origin',
          body:JSON.stringify(data),
          signal:controller.signal
        });
      } finally { clearTimeout(timeout); }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) throw new Error(result.error || 'The receiving service did not confirm your submission.');
      form.reset();
      updateVisibility();
      announce('Thank you. We have received your details and our team will contact you shortly.','success');
    } catch (error) {
      announce((error.name === 'AbortError' ? 'The request timed out.' : error.message || 'The enquiry could not be sent.') +
        ' Your details have not been confirmed as received. Please use anzmigrate.com/contact.');
    } finally {
      sending = false;
      submit.disabled = false;
      submit.innerHTML = originalButton;
    }
  }

  async function init() {
    try {
      const response = await fetch('./contact-schema.json', { cache:'no-cache' });
      if (!response.ok) throw new Error('Schema could not be loaded');
      schema = await response.json();
      if (schema.id !== 1 || !Array.isArray(schema.fields) || !Array.isArray(schema.conditions)) {
        throw new Error('Incorrect form definition');
      }
      const countries = schema.fields.find(field => field.key === 'country')?.options || [];
      const fragment = document.createDocumentFragment();
      for (const field of schema.fields) fragment.append(buildField(field,countries));
      mount.replaceChildren(fragment);
      mount.setAttribute('aria-busy','false');
      // The server uses the same schema and conditional rules to reject
      // missing required fields or values that are invalid for a branch.
      updateVisibility();
      submit.disabled = false;
      form.addEventListener('change', updateVisibility);
      form.addEventListener('input', event => {
        if (event.target?.hasAttribute?.('aria-invalid')) event.target.removeAttribute('aria-invalid');
        if (['text','email','tel','textarea'].includes(event.target?.type)) return;
        updateVisibility();
      });
      form.addEventListener('submit', submitForm);
    } catch {
      mount.setAttribute('aria-busy','false');
      mount.replaceChildren(make('p','form-loading','The questionnaire cannot be loaded right now. Please use the official ANZ Migrate enquiry form.'));
      announce('Unable to load the questionnaire. Use anzmigrate.com/contact to submit your enquiry.');
    }
  }
  init();
}
