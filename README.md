# Dipanshu Singh — portfolio

Vite + React + TypeScript portfolio with Classic and Graph modes.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Content

All site content lives in `src/data/content.json`. Project PDFs are served from `public/docs/`. Open content questions for the owner live in `CONTENT_QUESTIONS.md`; see `CLAUDE.md` for content rules.

The graph is derived from the content in `src/lib/graph.ts`; nodes and edges are not maintained separately.

## Assets

Regenerate the social preview image after changing the profile content:

```bash
npm run generate:og
```

Mode is mirrored in `?mode=classic|graph`, and the selected graph node in `?node=<id>`. The last mode is also saved to localStorage.
