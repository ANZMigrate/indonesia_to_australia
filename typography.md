# Typography — Indonesia to Australia

This is the applied typography baseline for the static ANZ Migrate website, adapted from the supplied "Typography — Jalanin" reference.

## Font
- Google Sans Flex, regular weight (400) for copy and headings.
- The current repository loads Google Sans Flex through its existing Google Fonts CSS import. No local font asset was supplied with this repository; do not invent one.
- Avoid artificially heavy heading weights, wide letter spacing and all-caps labels. Preserve readable wrapping, semantic heading order and keyboard focus.

## Type scale
| Role | Desktop | Mobile (767px or less) | Weight | Line height | Tracking |
| --- | --- | --- | --- | --- | --- |
| Hero heading | clamp(44px, 5vw, 72px) | 44px | 400 | 1.08 / 1.12 | -0.035em / -0.025em |
| Section heading | 37.5px | 35px | 400 | 1.25 | -0.025em |
| Supporting text | 17.5px | 17.5px | 400 | 1.6 | normal |
| Card/title heading | 20px | 17.5px | 400 | 1.4 / 1.6 | normal |
| Card copy | 15px | 15px | 400 | 1.6 | normal |
| Metadata, links and buttons | 15px | 15px | 400 | 1.5–1.6 | normal |
| Footer copyright | 13px | 13px | 400 | inherited | normal |

## Colors
- Headings: #111111 on light surfaces.
- Supporting text: #222222.
- Metadata: #656565 on white or other sufficiently light backgrounds.
- Navy buttons: #102568 with white text; hover #243966.
- Hero background in this project is dark, so preserve white headings and light supporting text. The source reference's white-on-photo instruction is adapted to this existing dark hero rather than introducing an unrelated photo.
- Light footer background with subtle divider and upward shadow, as in the supplied guide.

## Scope adaptation
- The supplied source describes Jalanin's React/Next.js internship UI and refers to files absent here. This repository is static HTML, CSS and vanilla JS; apply the visual system in styles.css and who-we-are.css.
- The approved source references public/logo.png, which is not in this repository. Use the existing text brand rather than fabricating a logo.
- The compact featured-role size of 15px becomes card-copy and metadata sizing; semantic card subheadings remain 20px (17.5px mobile) for legible hierarchy.
- Content form inputs, focus states, responsive navigation and required privacy information must remain functional.
