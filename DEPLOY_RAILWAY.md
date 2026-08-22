# Deploy to Railway

The project ships as a **single static HTML file** (everything inlined by
`vite-plugin-singlefile`) plus two fallback files. It runs on any static
host — Railway, Netlify, Cloudflare Pages, GitHub Pages, S3.

## Railway one-click

1. Push the repo to GitHub.
2. Railway → **New Project** → **Deploy from GitHub repo**.
3. Railway auto-detects Vite and runs `npm run build`. The output is in
   `dist/`.
4. (Optional but recommended for production) add the Firebase env vars
   under **Variables** so identity is verified server-side and OAuth
   works. The variables are read at *build time* by Vite — they are
   baked into the bundle.

| Variable                       | Required | Purpose                                  |
| ------------------------------ | -------- | ---------------------------------------- |
| `VITE_FIREBASE_API_KEY`        | yes      | Firebase project API key                 |
| `VITE_FIREBASE_AUTH_DOMAIN`    | yes      | OAuth redirect host                      |
| `VITE_FIREBASE_PROJECT_ID`     | yes      | Firestore project id                     |
| `VITE_FIREBASE_STORAGE_BUCKET` | no       | Media library bucket                     |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | no  | Push sender                              |
| `VITE_FIREBASE_APP_ID`         | yes      | Firebase web app id                      |

After adding / changing env vars, **Redeploy** so Vite bakes them in.

5. Set the **public domain** (or use the generated `*.up.railway.app`).
6. Open `https://<your-domain>/` → public site.
7. Open `https://<your-domain>/#/<adminPath>` → control center.
   The default admin path is `fb-control-x92k`. The first account you
   create is promoted to **OWNER**.

### SPA fallback

Two fallback files are emitted to `dist/` automatically:

- `dist/404.html` — redirects any unknown path to the hash router
- `dist/_redirects` — `/* /index.html 200` (Netlify / Cloudflare style)

For Railway, set **Rewrites** so any non-`/` path serves `index.html` /
`404.html`. The simplest pattern is the default `static` deploy with
`NIXPACKS_NO_NPM_CONFIG=1`; Railway will serve `index.html` at the root
and `404.html` for any other path, and `404.html` will bounce to the
hash router.

## Local preview

```bash
npm install
npm run build
# or:
npm run dev
```

## Backend modes

- **With Firebase env vars** → server-verified identity + Firestore persistence.
- **Without** → a local PBKDF2 credential store. The first account you
  create is promoted to OWNER automatically. Data is kept in the
  browser's `localStorage`. Use this for previews, demos, and single
  user setups.
