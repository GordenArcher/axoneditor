# Axon Editor Website

Landing website, blog, downloads, and release history for [Axon](https://github.com/axon-editor/axon), a lightweight AI-powered code editor built with Electron, React, TypeScript, and Go.

Product documentation is maintained separately at [axoneditor-docs.vercel.app](https://axoneditor-docs.vercel.app).

## Tech Stack

- [Astro](https://astro.build) — static site generator
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Lucide](https://lucide.dev) — icons
- TypeScript — type safety
- GitHub API — release data fetching

## Project Structure

```
axoneditor/
├── public/
│   ├── media/
│   │   ├── screenshots/     # Editor screenshots (.webp)
│   │   ├── demo/            # Demo video (.mp4)
│   │   └── icons/           # Brand icons
│   ├── fonts/               # Self-hosted fonts
│   └── favicon.svg
│
├── src/
│   ├── assets/              # Static assets (avoid if possible)
│   │
│   ├── components/
│   │   ├── layout/          # Header and footer
│   │   ├── ui/              # Button, Card, Icon, Container
│   │   └── home/            # Hero, FeatureGrid, DownloadCard
│   │
│   ├── layouts/
│   │   ├── BaseLayout.astro    # HTML shell, theme script
│   │   └── HomeLayout.astro    # Full width, no sidebar
│   │
│   ├── pages/
│   │   ├── index.astro          # Homepage
│   │   ├── download.astro       # Download page
│   │   ├── changelog.astro
│   │   ├── roadmap.astro
│   │   └── releases/[...slug].astro
│   │
│   ├── styles/
│   │   ├── global.css        # Tailwind + base
│   │   ├── typography.css    # Prose overrides
│   │   └── animations.css    # Smooth transitions
│   │
│   ├── lib/
│   │   ├── github.ts         # Fetch releases from GitHub API
│   │   ├── theme.ts          # Dark/light theme detection
│   │
│   └── data/                 # Blog and release data
│
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

## Design Principles

- **No gradients** — flat colors, borders for separation
- **No emojis** — all icons from Lucide
- **Smooth animations** — CSS transitions, no jank
- **Dark / light theme** — system preference + manual toggle
- **Separation of concerns** — layouts, components, lib, data each have one job
- **Cursor pointer on all buttons** — no dead zones
- **No comments in UI/return blocks** — comments only in logic where they help

## Development

### Install dependencies

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

## Environment Variables

Create a `.env` file for GitHub API token (optional, increases rate limit):

```
GITHUB_TOKEN=your_token_here
```

## Fetching Release Data

Releases are fetched from GitHub during build. To force a fresh fetch:

```bash
npm run build
```

## License

MIT
