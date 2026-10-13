/* Indonesia to Australia: contact form, independent from GSAP. */
(() => {
  'use strict';
  const form = document.getElementById('visa-contact-form');
  if (!form) return;

  const status = document.getElementById('contact-form-status');
  const submit = form.querySelector('button[type="submit"]');
  const visaSelect = document.getElementById('contact-visa');
  const destinationChoices = form.querySelectorAll('input[name="interestedIn"]');
  const dob = document.getElementById('contact-dob');
  const country = document.getElementById('contact-country');
  const dial = document.getElementById('contact-phone-code');
  const panels = form.querySelectorAll('.conditional-panel[data-show-for]');
  const originalButton = submit.innerHTML;
  let sending = false;
  let dialManuallyChanged = false;

  const dialCodes = {
    Indonesia: '+62', Australia: '+61', Singapore: '+65',
    Malaysia: '+60', 'Hong Kong': '+852', Vietnam: '+84',
    Thailand: '+66', Philippines: '+63', India: '+91',
    'United Kingdom': '+44', 'United States': '+1', 'New Zealand': '+64'
  };

  const setStatus = (message, state = 'error') => {
    status.hidden = false;
    status.dataset.state = state;
    status.textContent = message;
  };

  const clearStatus = () => {
    status.hidden = true;
    status.textContent = '';
    status.removeAttribute('data-state');
  };

  // Hidden fields never block validation or leak values from an earlier path.
  const updateConditions = () => {
    const route = visaSelect.value;
    panels.forEach(panel => {
      const show = panel.dataset.showFor.split(',').includes(route);
      if (show === !panel.hidden) return;
      panel.hidden = !show;
      panel.querySelectorAll('input, select, textarea').forEach(control => {
        control.disabled = !show;
        control.required = show && control.hasAttribute('data-required-when-visible');
        control.removeAttribute('aria-invalid');
        if (!show) {
          if (control.type === 'checkbox' || control.type === 'radio') control.checked = false;
          else control.value = '';
        }
      });
    });
  };

  const updateDestination = () => {
    const destination = form.querySelector('input[name="interestedIn"]:checked')?.value;
    const hint = document.getElementById('visa-choice-hint');
    if (hint) hint.textContent = destination === 'New Zealand'
      ? 'Choose the closest pathway. The ANZ Migrate team will review New Zealand-specific criteria.'
      : 'Choose the closest pathway. The questions below adapt to your selected pathway.';
    // The subclass 858 is an Australian pathway and is not shown for NZ enquiries.
    const nivOption = visaSelect.querySelector('option[value="innovation"]');
    if (nivOption) {
      nivOption.hidden = destination === 'New Zealand';
      nivOption.disabled = destination === 'New Zealand';
      if (nivOption.disabled && visaSelect.value === 'innovation') {
        visaSelect.value = '';
        updateConditions();
      }
    }
    // Destination changes do not discard other user-entered visa details.
  };

  const validateDate = () => {
    dob.setCustomValidity('');
    if (!dob.value) return;
    const [y,m,d] = dob.value.split('-').map(Number);
    const selected = new Date(y, m - 1, d);
    if (!y || !m || !d || selected.getFullYear() !== y ||
        selected.getMonth() !== m - 1 || selected.getDate() !== d ||
        selected > new Date() || y < 1900) {
      dob.setCustomValidity('Enter a valid date of birth that is not in the future.');
    }
  };

  const resetInvalidStyles = () => {
    form.querySelectorAll('[aria-invalid="true"]').forEach(node => node.removeAttribute('aria-invalid'));
  };

  visaSelect.addEventListener('change', () => { updateConditions(); clearStatus(); });
  destinationChoices.forEach(choice => choice.addEventListener('change', updateDestination));
  country.addEventListener('change', () => {
    if (!dialManuallyChanged && dialCodes[country.value]) dial.value = dialCodes[country.value];
  });
  dial.addEventListener('change', () => { dialManuallyChanged = true; });
  dob.max = new Date().toISOString().slice(0,10);
  dob.addEventListener('change', validateDate);
  dob.addEventListener('input', validateDate);
  form.addEventListener('input', (event) => {
    if (event.target instanceof HTMLElement) event.target.removeAttribute('aria-invalid');
  });

  // Start with every conditional group disabled until the visitor selects its pathway.
  panels.forEach(panel => {
    panel.hidden = true;
    panel.querySelectorAll('input, select, textarea').forEach(control => {
      control.disabled = true;
      control.required = false;
    });
  });
  updateConditions();
  updateDestination();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    clearStatus();
    resetInvalidStyles();
    validateDate();

    if (!form.checkValidity()) {
      const invalid = form.querySelector(':invalid');
      if (invalid && invalid.closest('.conditional-panel[hidden]')) updateConditions();
      if (invalid) {
        invalid.setAttribute('aria-invalid','true');
        invalid.focus({ preventScroll: true });
        invalid.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
      form.reportValidity();
      setStatus('Please check the required fields and correct any invalid information.');
      return;
    }

    const values = Object.fromEntries(new FormData(form).entries());
    values.phoneCode = dial.value;
    values.interestedIn = form.querySelector('input[name="interestedIn"]:checked')?.value || '';
    values.consent = document.getElementById('contact-consent').checked;
    if (!values.consent) {
      setStatus('Please read the privacy notice and give consent before submitting.');
      return;
    }

    sending = true;
    submit.disabled = true;
    submit.textContent = 'Sending details…';

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 25000);
      let response;
      try {
        response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(values),
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeout);
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.ok !== true) {
        throw new Error(typeof result.error === 'string' ? result.error : 'The enquiry could not be sent at this time.');
      }
      form.reset();
      dialManuallyChanged = false;
      dial.value = '+62';
      updateConditions();
      updateDestination();
      setStatus('Thank you. Your enquiry was received by the ANZ Migrate form service.', 'success');
      status.scrollIntoView({ behavior: 'auto', block: 'center' });
    } catch (error) {
      const message = error.name === 'AbortError'
        ? 'The request timed out. Please use the official ANZ Migrate contact form.'
        : (error.message || 'We could not send the enquiry.');
      setStatus(message + ' You can submit directly at anzmigrate.com/contact.');
    } finally {
      sending = false;
      submit.disabled = false;
      submit.innerHTML = originalButton;
    }
  });
})();
