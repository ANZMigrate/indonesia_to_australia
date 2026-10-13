# Indonesia to Australia — Site and integrations

## Design
Editorial responsive site with Google Sans Flex, CSS visual treatment and GSAP progressive animations (reduced-motion friendly).

## Contact and Indonesia phone
The form includes 46 non-file questions and 23 conditional rules from the user-supplied schema. Client and server both validate visible required fields; no attachments are requested or accepted.
The Indonesian contact phone is +62 21 3000 2058 (click-to-call).

## Server-side SMTP setup (Vercel)
Configure these values in Vercel Project → Settings → Environment Variables. Do not put passwords in GitHub or static website source:

- SMTP_HOST — hostname of authorized SMTP server.
- SMTP_PORT — 465 for implicit TLS or 587 for required STARTTLS.
- SMTP_USER — SMTP login username.
- SMTP_PASS — SMTP password / app password.
- SMTP_FROM_EMAIL — verified email address authorized for outbound mail.
- CONTACT_TO_EMAIL — inbox for contact form enquiries.

All six must be configured and nonempty for online submission to be available. Redeploy after adding or updating Vercel variables. The mail handler uses Nodemailer to await SMTP sendMail acceptance, with a plain-text message and visitor reply-to address. SMTP acceptance is not a guarantee of final inbox delivery. The prior external form-submission endpoint is not used.
No documents are accepted. The site has no built-in applicant database. Protect production SMTP from abuse with provider-level quotas, monitoring and an appropriate bot challenge/rate limiter before publicizing the form.

## Chatwoot live chat setup
The website integrates a Chatwoot Website Inbox at https://c.anzmigrate.com across all six pages.
Set CHATWOOT_WEBSITE_TOKEN in the same Vercel project environment (the Website Inbox token in Chatwoot Settings → Inboxes → Website Inbox → Configuration). This is the public browser widget identifier, not a private Chatwoot API key.
The widget loader fetches /api/chat-config and initializes the official Chatwoot SDK only when that token is configured. Nothing is displayed when the variable is absent. Redeploy after updating the token. Chat messages and service cookies are handled by the self-hosted Chatwoot instance. The privacy notice identifies the live chat integration.

## QA
Test the click-to-call button, conditional branches, mobile form styling, form validation and correct error states; confirm credentials are not sent to browsers or committed to Git. After entering environment values, send a legitimate test enquiry and confirm the destination inbox receives it; check that the Chatwoot bubble appears and receives a test message.
