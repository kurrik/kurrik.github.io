# kurrik.github.io

Monorepo for GitHub Pages projects (e.g., posterize, html2md) using TypeScript and modern build tooling.

## Structure

- `src/PROJECT/` — Source files (TypeScript, HTML, CSS, assets)
- `dist/PROJECT/` — Built output (deployed to GitHub Pages)

## Scripts

- `npm run build` — Clean and build all projects
- `npm run dev` — Watch for changes and serve locally

## Deployment

Deploys automatically to GitHub Pages on push to `main` via GitHub Actions.
