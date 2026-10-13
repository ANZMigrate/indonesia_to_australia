# Indonesia to Australia — Design and integration notes

## Visual design

Modern editorial layouts, responsive content cards, deliberate spacing, and accessible contrast. The primary font is Google Sans Flex with system sans-serif fallbacks. The homepage retains a dark hero and restrained geometry built entirely with CSS. GSAP is a progressive enhancement, honors reduced-motion preferences, and never controls the availability or validity of the questionnaire.

## Contact questionnaire

The `#contact-cta` section contains a conditional enquiry form. The public `contact-schema.json` contains **46 questions** and **23 conditional rules** adapted from the supplied form definition. All four document-upload fields and their four dependent rules have been fully removed.

`contact-form.mjs` renders questions, option values, and conditional visibility using `contact-rules.mjs`. Hidden answers are cleared. The server repeats validation and only sends allowed answers. Required questions are checked before submission. No document or file-upload elements exist in the form.

## Receiving service

The contact form is deliberately unaffiliated with any external migration brand. The API does not contain a hardcoded receiving service or send data to a previously linked provider.

To enable online submissions, configure the following Vercel environment variables:

- `CONTACT_SUBMIT_ENDPOINT` — HTTPS URL of your own authorized enquiry receiving service.
- `CONTACT_SUBMIT_HOST` — exact hostname of that same receiving service (allowlist).
- `CONTACT_SUBMIT_FORMAT` — optional `payload` (default) or `convert`.

Without an independently configured endpoint, the questionnaire remains browsable but **Send details** is disabled. No receipt is claimed and no visitor data is sent. The receiving service must respond with a confirmation such as `{"success":true}` or a document ID. Confirm that the destination's request shape matches the configured format before enabling live submissions.

Do not configure a third-party endpoint without permission to collect and process enquiries there. Keep privacy notices current when configuring a receiver. Do not add attachment handling without a separate security and data-retention review.

## Quality checks

1. Verify responsiveness, keyboard navigation and color contrast.
2. Test the branching logic for citizenship, sponsorship, work, partnership, resident-return, visitor and student cases.
3. Confirm there are no file inputs, document-upload conditions or third-party branded contact details.
4. Confirm unavailable and failed submissions have a truthful error state.
5. Recheck legal and migration information against current official sources before publication.
