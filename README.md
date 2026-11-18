# Patricio Hernández Vergara · Portfolio

Personal portfolio of Patricio Hernández Vergara, a full-stack developer from Viña del Mar, Chile, focused on PHP and Python back-end development, process automation, web scraping and AI projects with RAG.

**Live site:** https://TU-DOMINIO.vercel.app

## Features

- Single-page site built with plain **HTML, CSS and JavaScript**: no frameworks, no build step.
- **Three languages** (English, Spanish, French). The choice is remembered, and the browser language is used on the first visit.
- **Dark and light themes** driven by CSS custom properties, applied before first paint to avoid flashing.
- Animated star-field background on `<canvas>` that respects `prefers-reduced-motion`.
- Responsive layout with a mobile menu and collapsible text on small screens.
- Downloadable CV in each language.
- SEO metadata: Open Graph, Twitter card, JSON-LD, `robots.txt` and `sitemap.xml`.

## Project structure

```
index.html        Page markup (English content preloaded for crawlers and no-JS)
styles/main.css   Styles and theme variables
scripts/main.js   Translations, theme, language, mobile menu and canvas animation
assets/           Images, CVs and Open Graph image
```

## Run locally

Any static file server works. For example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Contact

- GitHub: [PytricioPUCV](https://github.com/PytricioPUCV)
- LinkedIn: [patricio-elias-hernandez](https://www.linkedin.com/in/patricio-elias-hernandez)
