# Indonesia to Australia agent notes

## Purpose

This is a standalone static Australian immigration information site for Indonesian professionals, graduates and students. It covers skilled migration, employer sponsored skilled visas and Student visa subclass 500 only.

## Project boundaries

- Use semantic HTML, local CSS and local vanilla JavaScript.
- Keep the site deployable by opening its own `index.html` or serving the folder as a static root.
- Do not add React, Vue, Next.js, Tailwind, Bootstrap, jQuery, TypeScript, npm packages, build tools or a backend.
- Do not add a contact form, fake submission state, eligibility calculator, chatbot, testimonial, rating or invented professional credential.
- Do not add unrelated visa categories.
- The website name is the brand identifier. Do not create a logo, logo mark, flag, mascot or invented firm identity.

## Page map

- `index.html`: country or network overview, visa set, study entry point and evidence review.
- `visas/index.html`: subclasses 189, 190, 491, 482, 186 and 494 comparison.
- `skillselect/index.html`: ten step SkillSelect and EOI sequence.
- `study/index.html`: Student visa subclass 500 process, Genuine Student requirement and post study considerations.
- `faq/index.html`: search intent questions written for this audience.
- `privacy/index.html`: static site privacy note and immigration disclaimer.

## Content guardrails

Use current Australian terminology: Skills in Demand visa subclass 482, Employer Nomination Scheme visa subclass 186, Skilled Employer Sponsored Regional visa subclass 494, Student visa subclass 500, Genuine Student requirement, Confirmation of Enrolment, CRICOS, OSHC, SkillSelect, Expression of Interest and ImmiAccount.

Do not invent visa charges, processing times, invitation scores, state nomination allocations, salary thresholds, quotas, approval rates, course fees or professional registration details. State clearly that a minimum 65 point threshold for subclasses 189, 190 and 491 does not guarantee an invitation. Studying in Australia does not guarantee permanent residence.

Use the Department of Home Affairs as the primary immigration source and CRICOS for course and provider registration. Link to current official pages when adding a new rule.

## Interaction rules

GSAP is loaded from a pinned public CDN URL. The local `script.js` must work if GSAP is unavailable, and must respect `prefers-reduced-motion`. Keep native `details` accordions keyboard accessible. Never hide core content behind animation.

## QA before handoff

1. Open every page directly from the site folder.
2. Check navigation from every page and keyboard focus states.
3. Check mobile navigation, FAQ accordions and scroll progress.
4. Confirm no console errors if the CDN is unavailable.
5. Search visible HTML for em dashes, en dashes and generic marketing phrases.
6. Recheck every current visa rule against Home Affairs before publishing.
7. Replace site-relative sitemap values with the production origin before submitting the sitemap to search engines.
