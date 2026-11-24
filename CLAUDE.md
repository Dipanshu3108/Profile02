# CLAUDE.md

Personal portfolio for Dipanshu Singh. Vite + React 19 + TypeScript, with two views behind a toggle:

- **Classic**: hero, skill marquee, About (with stat tiles), Experience, Education + Certifications, Projects, Contact.
- **Graph**: a 3D knowledge graph (react-force-graph-3d / three.js) with an info card panel (a bottom sheet on mobile).

`plan.md` is the original build brief. Its design system (light pebble palette, Newsreader, 2D SVG graph) has been **superseded** by the dark "AI-lab" redesign below. Its rules on content and links still apply.

## Commands

```bash
npm run dev          # Vite dev server (port 5173; .claude/launch.json uses 5180)
npm run build        # tsc + vite build; must pass before reporting done
npx tsc --noEmit     # quick typecheck
npm run generate:og  # regenerate public/og.png after profile changes
```

There is no test suite. Verify with typecheck, build, and the browser.

## Content rules (most important)

- **`src/data/content.json` is the single source of truth.** Every name, date, metric and link on the site comes from there. The graph is derived from it in `src/lib/graph.ts`; never hand-maintain nodes or edges.
- **Never invent facts.** If something is missing, ask the owner. The workflow used so far: write questions to `CONTENT_QUESTIONS.md` (show the current value plus an `Answer:` line; an empty answer means "let it be"/no), apply the answers, then replace the file with only the remaining follow-ups.
- **Sources:** project PDFs in `PDFs/` (originals) and `public/docs/` (served copies, kebab-case). Cross-check project facts against the PDF text (`pdftotext -layout` is available). The PPTX and UniversotyInfo.txt that the first pass used are no longer in the repo.
- **Owner decisions to respect:**
  - Focus skills are `profile.focusSkills` = Knowledge graphs, Graph engineering. They are highlighted in amber (✦) everywhere.
  - No project gets special visual featuring. Research Bot must not be highlighted over the others.
  - Project years are not shown. Academic projects link to their **PDF only**, even where the PDF mentions a repo; the Tic-Tac-Toe repo is private.
  - No resume download button. All external links use `target="_blank" rel="noopener noreferrer"`.
  - Proofs of concept (`kind: "poc"`) appear both in Classic (labelled "Proof of concept") and in the graph (smaller hexagon with a wireframe shell).
  - Academic projects link project → course → degree. CSE 535 belongs to the MS only, and Astro Seed is the BS capstone.
- **Ask before adding any new dependency.**

### Content schema highlights (`src/types.ts`)

- `profile`: headline, `status` (header pill), `focusSkills`, `stats` (About tiles; each has an optional `projectId`), socials.
- `experience[]`: `location`, `topSkills` (shown first on the card), `skills`.
- `education[]`: `gpa`, `honors`, `activities`, `notes`.
- `courses[]`: `{ id, code, name, term? }`.
- `projects[]`: `experienceId`, or `educationId` + `courseId`; plus `team` and `kind?: 'poc'`.
- `skills[]`: `category`, and `generic: true` for broad tools (Python, Git, Docker, Copilot, Claude Code). Generic edges are drawn faintly and pull at a third of normal strength.
- `skillRelations`: skill↔skill pairs. `certifications[]`: name, issuer, date, verify URL, skills.

## Code map

- `src/lib/content.ts`: typed content, `focusSkills`, `sortByFocus`.
- `src/lib/graph.ts`: builds nodes and edges. Edge kinds: structural, worked-at, part-of, studied-in, used-in, related, certified.
- `src/lib/urlState.ts`: `?mode=classic|graph&node=<id>`. Classic is the main view: every visit opens it unless the link asks for the graph (the last-used view is deliberately not remembered). Deep links must keep working.
- `src/lib/theme.ts`: `useTheme` (dark default, light remembered in localStorage, writes `html[data-theme]` and the theme-color meta). `index.html` applies the saved theme before first paint.
- `src/lib/reveal.ts`: `circularReveal`, the View Transitions circle used by both the mode switch (750 ms) and the theme switch (520 ms, grows from the sun/moon button).
- `src/App.tsx`: mode and theme switches (both via `circularReveal`), and a lazy-loaded `GraphView` chunk (~420 KB gzip).
- `src/components/Graph3D.tsx`: the 3D scene. See the gotchas below.
- `src/components/InfoCard.tsx`: per-type cards. Every connection is clickable.
- `src/components/ClassicView.tsx`, `ProjectCard.tsx`, `HeroNetwork.tsx` (2D canvas constellation), `SkillMarquee.tsx` (curated: focus + top role skills + skills used in 2+ projects).
- `src/styles/tokens.css`: design tokens. Plus `base.css`, `classic.css` and `graph.css` (plain CSS, no framework).

## Design system (current)

- Two themes, dark is the default. Dark: bg `#05070d`; ink `#eef1f6` / `#b9c1d0` / `#7d879b`; accents mint `#8bf5c8`, blue `#6ea8ff`, violet `#b79cff`, amber `#f5c26b` (focus skills only).
- Light (owner's brief: warm sand, sage mint): bg `#f4ede2`, raised `#fbf7f0`; ink `#2a251e` / `#4f483d` / `#6f665a`; mint `#2b7356`, amber `#9a5f0c`. Every text token holds at least 4.5:1. It is a `:root[data-theme='light']` block in `tokens.css` that redefines the same token names, so stylesheets need no theme rules. Keep it that way: a new token needs a value in both blocks.
- Canvas and WebGL can't read CSS, so their colours are per-theme maps: `GRAPH_PALETTE` in `graphColors.ts` (light turns bloom off, since the sand ground would bloom; it also keeps fog very thin, self-glow at 0.3 and links at 0.8 opacity, because fog toward sand washes the whole scene out), `PALETTE` in `HeroNetwork.tsx`, `ORB_INK` in `ProjectCard.tsx`. thinking-orbs and bot-avatars read `data-theme` themselves.
- A theme switch in Graph mode hands `nodeThreeObject` a new accessor, which rebuilds every node mesh (old ones are disposed).
- Every colour goes through `src/styles/tokens.css`. Translucent tints are named `--<hue>-a<percent>` (e.g. `--mint-a35`); add a token rather than writing `rgba()` in a stylesheet.
- Fonts: Bricolage Grotesque (display), Inter (body), JetBrains Mono (small meta labels: dates, card types, counts).
- Spacing sits on a 4px scale (padding, margin, gap). Headings use `text-wrap: balance`, body copy `pretty`. Date ranges read "Aug 2024 to Present" (no dashes).
- No gradient text, no coloured zero-offset glows, no eyebrow/kicker lines above section headings, no middle-dot meta strings or arrows glued to labels, no decorative pulse dots. Section headings are plain (About, Experience, Education, Projects, Contact). Icons are drawn SVGs in `src/components/icons.tsx`, not glyphs.
- Node colours live in `src/components/graphColors.ts`. Shapes: profile = icosahedron with a ring, experience = cube, education = rotated cube, course = tetrahedron, project = hexagonal prism, certification = dodecahedron, skill = sphere, contact = octahedron.
- thinking-orbs appear in three places: graph loading, the info-card empty state, and a 64px `working` orb (tinted mint) beside every project card's "Explore in graph" (always animating; negative margins let it overhang so the row keeps its text height). Keep the footer credit.
- bot-avatars (owner's picks, all `shading="plastic"`, 64px): `mech` and `hexagon` idle after the last word of the hero name (they wrap below it on narrow screens), and `clover`, `flower`, `ghost`, `star` in `state="working"` beside the Contact heading. Working bots all start their hop cycle at the same point, so each Contact bot (`StaggeredBot`) stays paused for a random 0 to 1.2 s first; `seed` only offsets blinks and glances. All decorative (`aria-hidden`). Every `BotAvatar` needs `className="bot-avatar"`: its canvas is 1.5x the bot's size, and the global `canvas { max-width: 100% }` would otherwise squash it sideways. Keep the footer credit.

## Graph behaviour (keep these when editing)

- Motion should feel smooth, not twitchy: orbit `rotateSpeed 0.45`, `zoomSpeed 0.5`, `dampingFactor 0.05`, slow auto-rotate that pauses on interaction, and `d3VelocityDecay 0.55`.
- **The graph is free.** The owner does not want any part of it frozen or held to its original shape. On the first engine stop, only the root (profile) position is saved (`rootHomeRef`), every node is unpinned, and the built-in `center` force is removed (it snaps the mean position to the origin every tick, which would undo Reset's slide).
- Dragging uses the live simulation. The dragged node pulls its neighbours through the links, and on release nodes stay wherever the physics settles them. There is no automatic return to the original layout, so the shape can change over time.
- Zoom-out is capped by `controls.maxDistance`: 800 on desktop (owner's preferred furthest view), 1400 below 860px so the whole graph still fits on phones.
- **Reset view** slides the whole graph (shape unchanged) over about 900 ms so the root is back at its saved spot, unpins every node, then refits the camera with `fitAll`. It does not restore the original layout. It also clears filters and the selection.
- `fitAll` fits from the **default camera direction**, not the current one (custom maths, not `zoomToFit`). From an orbited angle the graph is taller, and the zoom-out cap would crop it.
- The first load zooms to fit everything (the owner wants it zoomed out). Selecting a node flies the camera to it.
- Charge has `distanceMax(260)`, so loosely tied nodes aren't pushed into space. Check outliers offline with d3-force-3d when changing forces.
- Bloom is subtle (strength 0.35, threshold 0.82). Labels are kept below the bloom threshold, so they don't glow.
- Skill and certification labels show on hover or selection only.
- Labels grow with their distance from the camera (`LABEL_ZOOM_*` in `Graph3D.tsx`) so the zoomed-out view stays readable at about 13px; the reference distance scales with canvas height.

### Gotchas (learned the hard way)

- **Ref timing:** react-force-graph's ref isn't ready in the parent's first effect. Use the callback ref (`attach` → `api` state) and key effects on `api`.
- **Camera view offset:** the renderer clears it on its first deferred update, so it is re-applied after 120 ms. The offset keeps the graph centred beside the info card.
- **Washed-out background:** set `scene.background` explicitly and keep the `OutputPass` after bloom. Otherwise the background is double gamma-encoded into grey.
- **Vite duplicate-React errors** after installing deps: heavy deps are listed in `optimizeDeps.include`. Clear `node_modules/.vite` if "Invalid hook call" appears.
- **Hidden preview pane:** when the browser pane is hidden, rAF and ResizeObserver pause, so animations, camera tweens and the simulation freeze and screenshots look stale. Verify motion with the pane visible, or check the logic offline.

## Accessibility floor

- There is no pause switch in the header (the owner removed it). Looping motion (marquee, grain, hero canvas, graph auto-rotate, the cards' orbs, the bots) stops only under `prefers-reduced-motion`: CSS loops via the list at the end of `base.css`, canvas loops via `usePrefersReducedMotion`. Any new infinite animation must be added to one of those.
- `prefers-reduced-motion` turns the loops off and hides the scroll cue; it no longer shortens every animation to 0.01ms.
- Switching mode pushes a history entry, so Back returns to the previous view. Node changes inside the graph replace the entry.
- `GraphErrorBoundary` shows a fallback (with "Switch to Classic") if WebGL is missing or the graph chunk fails to load.

- Visible mint focus rings.
- Graph keyboard navigation: arrows move between neighbours, Enter selects, Escape clears.
- A screen-reader-only list of all nodes (`.graph-list-a11y`, kept out of the Tab order).
- Responsive down to 360px with no horizontal scroll. Below 760px the section links move into a header menu (Escape and outside click close it).
