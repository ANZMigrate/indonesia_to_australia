/* Simple, five-field Indonesia to Australia enquiry form. */
(() => {
  const form = document.getElementById('visa-contact-form');
  if (!form) return;

  const send = form.querySelector('button[type="submit"]');
  const country = document.getElementById('contact-country');
  const status = document.getElementById('contact-form-status');
  const buttonContents = send.innerHTML;
  let sending = false;
  let serviceReady = false;

  const notice = (message, kind = 'error') => {
    status.hidden = false;
    status.dataset.state = kind;
    status.textContent = message;
  };
  const dismiss = () => {
    status.hidden = true;
    status.textContent = '';
  };

  async function refreshSettings() {
    const response = await fetch('/api/contact', {
      headers: {Accept: 'application/json'},
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('The contact service is unavailable.');
    const settings = await response.json();
    if (!Array.isArray(settings.countries) || settings.countries.length < 50) {
      throw new Error('The country list could not be loaded.');
    }
    const options = [new Option('Select your country of residence', '')];
    const countries = settings.countries
      .filter(item => item && typeof item.label === 'string' &&
        typeof item.value === 'string' && /^[A-Z]{2}$/.test(item.value))
      .sort((a, b) => a.label.localeCompare(b.label, 'en'));
    for (const item of countries) options.push(new Option(item.label, item.value));
    const existing = country.value;
    country.replaceChildren(...options);
    country.disabled = false;
    if (existing && countries.some(item => item.value === existing)) country.value = existing;
    serviceReady = settings.submissionReady === true;
    send.disabled = !serviceReady;
    return serviceReady;
  }

  async function init() {
    try {
      const ready = await refreshSettings();
      if (!ready) {
        notice('Online enquiry delivery is temporarily unavailable. You can contact us by phone or WhatsApp.', 'info');
      }
    } catch {
      send.disabled = true;
      country.disabled = true;
      country.replaceChildren(new Option('Country list unavailable', ''));
      notice('The contact form is temporarily unavailable. Please use the phone or WhatsApp contact options.', 'error');
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !serviceReady) return;
    dismiss();

    const phoneInput = document.getElementById('contact-phone');
    const phone = phoneInput.value.trim();
    if (!/^\+?[\d ()-]{6,32}$/.test(phone) ||
        phone.replace(/\D/g, '').length < 6 ||
        phone.replace(/\D/g, '').length > 16) {
      phoneInput.setCustomValidity('Please enter a valid phone number, including the country code if applicable.');
    } else {
      phoneInput.setCustomValidity('');
    }

    if (!form.reportValidity()) return;
    const payload = {
      name: document.getElementById('contact-name').value.trim(),
      email: document.getElementById('contact-email').value.trim(),
      phone,
      country: country.value,
      additionalNotes: document.getElementById('contact-additional-notes').value.trim(),
      consent: document.getElementById('contact-consent').checked,
      companyWebsite: form.querySelector('[name="companyWebsite"]').value
    };
    sending = true;
    send.disabled = true;
    send.textContent = 'Sending enquiry…';

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
      let response;
      try {
        response = await fetch('/api/contact', {
          method: 'POST',
          headers: {'Content-Type':'application/json','Accept':'application/json'},
          credentials: 'same-origin',
          body: JSON.stringify(payload),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeout);
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || 'The mail service did not confirm acceptance.');
      }
      form.reset();
      phoneInput.setCustomValidity('');
      notice('Thanks. Your enquiry was accepted for email delivery.', 'success');
    } catch (error) {
      notice(
        (error.name === 'AbortError' ? 'The request timed out.' :
          error.message || 'The enquiry could not be sent.') +
        ' Please try again or contact us by phone or WhatsApp.',
        'error'
      );
    } finally {
      sending = false;
      send.innerHTML = buttonContents;
      // A delivery error should not be mistaken for a completed submission.
      try {
        await refreshSettings();
      } catch {
        serviceReady = false;
        send.disabled = true;
      }
    }
  });

  document.getElementById('contact-phone').addEventListener('input', event => {
    event.target.setCustomValidity('');
  });

  init();
})();
