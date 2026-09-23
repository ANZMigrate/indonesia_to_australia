# Indonesia to Australia design system

## Direction

A document-led editorial system that gives qualification and occupation evidence a clear visual priority.

## Audience and tone

The primary audience is Indonesian professionals, graduates and students. The voice is precise, calm and document-led. Explain the evidence and sequence rather than promising an outcome. Avoid vague conversion language and avoid claims that a visitor qualifies.

## Type

- Primary family: Google Sans Flex, Arial, sans-serif.
- Body size: 16px base with 1.65 line height.
- Reading copy: approximately 17px to 19px where a longer paragraph needs more comfort.
- Hero heading: responsive, capped around 88px on wide desktop, with a more restrained mobile scale.
- Section headings: responsive, capped around 57px.
- Use weight 680 to 760 for hierarchy. Reserve the strongest weight for H1, H2 and visa subclass numbers.

## Layout

- Maximum content width: 1440px.
- Page gutters use a responsive CSS variable.
- Hero layout uses an asymmetric two-column editorial composition on desktop.
- Content pages use page heroes, comparison rows, evidence cards, numbered process steps, FAQ details and a dark source panel.
- Keep long text below approximately 780px for comfortable reading.
- Mobile layout becomes one column with touch-sized controls and no horizontal scrolling.

## Colour and surfaces

Red clay accent on warm ivory, with rounded editorial cards.

The design uses warm or cool paper-like surfaces, ink text, muted secondary text, fine borders and one restrained accent. Colour is never the only signal for a visa type. Dark sections are used for source links and high attention transitions.

## Components

- Sticky text-only header with keyboard accessible mobile menu.
- Hero visual made from CSS geometry, not stock photography or a logo.
- Two route cards for skilled migration and study.
- Six visa cards or comparison rows for subclasses 189, 190, 491, 482, 186 and 494.
- Numbered process list for SkillSelect and Student visa preparation.
- Evidence cards for skills assessment and Genuine Student topics.
- Native FAQ details with one open item at a time.
- Footer disclaimer and privacy page. There is no contact form in this version.

## Motion

The local script uses GSAP for header entrance, hero entrance, card reveal and a restrained floating visual card. Motion is progressive enhancement. If GSAP does not load or reduced motion is enabled, all content remains visible and usable.

## Further development

- Add a real production hostname to the XML sitemap before launch.
- Recheck official Home Affairs and CRICOS URLs when content changes.
- If a form is added later, define the endpoint, privacy notice and success or error states before adding fields.
- Keep country-specific copy genuinely rewritten. Do not make doorway pages by changing only the country name.
