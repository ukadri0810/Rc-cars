# KAS RC Arena v1.2 — GitHub Pages Ready

KAS RC Arena is a mobile-first PWA for managing RC vehicle rentals, live ride timers, pricing, batteries, fleet status, payments, ride history and owner settings.

## Current data mode

This build does **not** use Firebase. Operational data is stored on the device/browser. Data on one device will not automatically appear on another device.

## Default PINs

- Operator: `1111`
- Owner: `1234`

Change them from Owner settings before live use.

## Deploy to GitHub Pages

### Recommended: automatic GitHub Actions deployment

1. Create a new GitHub repository, for example `kas-rc-arena`.
2. Upload **all files and folders from this project root** to the repository root. Do not upload an extra outer folder.
3. Commit and push to the `main` branch.
4. On GitHub open **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **GitHub Actions**.
6. The included workflow at `.github/workflows/deploy-pages.yml` will deploy the site.
7. Open the URL shown by the workflow or GitHub Pages settings.

The PWA has been configured to work both on a root domain and on a GitHub Pages project path such as:

`https://USERNAME.github.io/kas-rc-arena/`

## Important

Do not double-click `index.html` for normal use. JavaScript modules and PWA features require the app to be served over HTTP/HTTPS.

GitHub Pages will serve it correctly.

## Local testing

If Node.js is installed:

```bash
npm start
```

Then open:

`http://localhost:4173`

You can also use VS Code Live Server.

## Main project files

- `index.html` — application shell
- `styles.css` — responsive UI
- `js/app.js` — application UI and workflows
- `js/store.js` — local data/repository layer
- `js/utils.js` — helpers
- `manifest.webmanifest` — PWA manifest
- `sw.js` — offline/service-worker support
- `assets/` — KAS branding and PWA icons
- `.github/workflows/deploy-pages.yml` — GitHub Pages deployment

## Firebase later

The current build intentionally keeps Firebase out. When Firebase is added, the local repository layer can be replaced/extended with authentication and cloud sync while keeping the core UI workflows.
