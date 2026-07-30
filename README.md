# Pantry — Household Inventory

A self-hosted, single-user household inventory app: track what's in your home, get shopping lists generated from low-stock items, scan receipts to log prices automatically, scan barcodes to add items, and ask it things like "what's low in the kitchen" in plain English.

## Stack

- **Next.js 14** (App Router, TypeScript) + Tailwind CSS
- **PostgreSQL** via **Prisma** (v5)
- **NextAuth** (Credentials provider, JWT session in an HTTP-only signed cookie)
- **Tesseract.js** for receipt OCR
- **html5-qrcode** for barcode scanning + **OpenFoodFacts** for product lookup
- **Recharts** for price/spend charts
- A provider-agnostic AI client (`src/lib/ai/client.ts`) that talks to either **Anthropic's Claude API** or a **local Ollama server**, selected via `AI_PROVIDER`, both through an OpenAI-compatible `/chat/completions` interface

## Running locally

Requirements: Node 22+ (Node 20 is past end-of-life), a local PostgreSQL instance (or `docker run` one, see below), and Docker if you want to test the container build.

1. Copy the environment template and fill in real values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `AUTH_SECRET` (generate with `openssl rand -base64 32`) and point `DATABASE_URL` at a Postgres instance. If you don't have one running, the quickest option is:

   ```bash
   docker run -d --name pantry-dev-db \
     -e POSTGRES_USER=inventory -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=inventory \
     -p 5432:5432 postgres:16-alpine
   ```

2. Install dependencies and set up the database schema:

   ```bash
   npm install
   npx prisma migrate dev
   ```

   This applies every migration under `prisma/migrations/` — it's the "migration/setup script" that makes the schema reproducible; run the same command (or `prisma migrate deploy` in production) on any fresh database.

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The first account you create becomes the app's one owner account — signup closes after that (see Security below).

   Two dev-only gotchas worth knowing:

   - **Don't run `npm run build` while `npm run dev` is running.** They share `.next/`, and the production build replaces the chunks the dev server is serving, which shows up as a completely unstyled page. Fix: stop the dev server, `rm -rf .next`, start it again.
   - **The service worker is disabled in development** on purpose. Next serves dev chunks under stable filenames, so caching them pins the app to a stale build. If a worker from an earlier run is still registered, the app unregisters it and clears its caches automatically on next load.

## Accounts and password recovery

There are **no default credentials.** The first account you create through `/signup` becomes the owner, and signup closes permanently after that — `/api/auth/signup` returns 403 to everyone from then on. If you see *"Signup is closed. This app already has an owner account."*, an account already exists; go to `/login` instead.

Because the app is single-user and has no email delivery, there's no self-service "forgot password" flow. Reset it from the machine (or container) that can reach the database:

```bash
npm run set-password
```

It prompts for a new password twice, hides your typing, and updates the hash in place — inventory, receipts, and price history are untouched. Inside Docker: `docker compose exec app npm run set-password`.

To find out which email owns the account:

```bash
npx prisma studio
```

Starting completely over is also an option, but note that deleting the user row **cascade-deletes all inventory, receipts, and price history** (every table is scoped to `userId` with `onDelete: Cascade`). Only do this if you genuinely want an empty app — export your data first from Settings if not.

## AI provider setup

Set `AI_PROVIDER` to `claude` or `ollama` in `.env`.

- **`claude`**: set `ANTHROPIC_API_KEY`. Uses Anthropic's OpenAI-compatible endpoint, so receipt/photo/text data for those features is sent to Anthropic's API.
- **`ollama`**: point `AI_OLLAMA_BASE_URL` at your Ollama server's OpenAI-compatible endpoint (default `http://localhost:11434/v1`) and set `AI_OLLAMA_MODEL` to a model you've pulled that can follow JSON-output instructions — for the photo-to-item feature you'll need a vision-capable model (e.g. `llava`). Nothing leaves your network, but parsing quality (especially on messy/multilingual receipts) will generally be weaker than Claude.

You can switch providers any time — restart the app after changing `.env`.

## OCR languages

Receipt text extraction uses Tesseract.js, defaulting to English (`OCR_LANGUAGES="eng"`). If your receipts mix in other scripts, add the matching Tesseract language codes, `+`-joined, e.g.:

```
OCR_LANGUAGES="eng+vie+chi_sim"
```

Additional language data downloads the first time it's needed. The AI parsing step is prompted to expect multilingual/abbreviated receipt text regardless, but it can only work with what the OCR pass actually reads — the language pack has to match the receipt's script.

## Security notes

- Every route and API endpoint requires an authenticated session (`src/proxy.ts` — Next 16's name for the middleware convention); the only public routes are `/login`, `/signup`, and NextAuth's own endpoints.
- Image URLs are allowlisted before rendering (`src/lib/image-src.ts`): only this app's own `/api/files/...` paths and locally created `blob:` previews are allowed, so a crafted `?imageUrl=` link cannot put a remote or `data:`/`javascript:` URL into the page.
- Passwords are hashed with bcrypt (cost factor 12), never stored in plain text.
- Sessions are JWTs in an HTTP-only, signed cookie — never exposed to client JS or stored in localStorage. NextAuth adds the `Secure` flag and the `__Secure-` cookie prefix only when `NEXTAUTH_URL` starts with `https://`, so **set `NEXTAUTH_URL` to your public HTTPS URL** in any deployed environment; leaving it as `http://...` silently downgrades the session cookie.
- The login endpoint is rate-limited (5 attempts / 10 minutes per IP+email) — see `src/lib/rate-limit.ts`. It's in-memory, which is fine for a single-instance deployment; move it to Redis if you ever run more than one app replica. Tripping it shows a distinct "Too many login attempts" message rather than blaming your password, and restarting the app clears the counters.
- Uploaded photos and receipts are stored **outside** `/public`, in `UPLOAD_DIR`, and are only ever served through the authenticated `/api/files/[filename]` route — there is no public, guessable URL for them. That route also checks the file was uploaded by the requesting account (via the `Upload` table), so being logged in is not on its own enough to read a file, and it rejects any filename containing path separators.
- Signup is single-use: once one account exists, the signup endpoint returns 403 for everyone else. This is a single-user app by design.
- HTTPS is expected to be terminated by your own reverse proxy in front of the app container (see Deployment below) — the app itself serves plain HTTP inside your network.

## Deployment (Docker on a NAS)

This assumes you already have a reverse proxy on your NAS (Synology's built-in one, Traefik, Caddy, Nginx Proxy Manager, ...) handling HTTPS termination for your other services.

1. Copy `.env.example` to `.env` on the NAS and fill in real values — `AUTH_SECRET`, `POSTGRES_PASSWORD`, `NEXTAUTH_URL` (the public HTTPS URL your reverse proxy exposes this app at), and your AI provider settings.
2. Build and start:

   ```bash
   docker compose up -d --build
   ```

   This builds the app image, starts Postgres (with a named volume for its data), runs pending migrations automatically on container start (`docker-entrypoint.sh`), and starts the app on port 3000.
3. Point your reverse proxy at `http://<nas-host>:3000` (or the `app` container's internal compose network address if your proxy is also a container on the same Docker network) and make sure it forwards HTTPS traffic there.
4. Uploaded photos/receipts persist in the `uploads` named volume; Postgres data persists in `db-data`. Back both up if you care about not losing your inventory and receipt history.

To apply schema changes after pulling an update: `docker compose up -d --build` re-runs migrations automatically via the entrypoint script — no manual step needed.

### Cross-architecture builds

Build on the NAS itself (or the same CPU architecture it runs on) so `docker compose build` produces a matching image. If you're building on a different architecture (e.g. an Apple Silicon Mac targeting an x86 NAS), use `docker buildx build --platform linux/amd64` instead of a plain build.

## Data export

Settings → Export gives you the full database as JSON (one nested file, most complete) or CSV (a zip with one file per table: items, item_locations, price_history, shopping_list, receipts, receipt_lines). Your data is never locked into this app.

## Project structure

```
prisma/schema.prisma       Data model + migrations
prisma.config.ts           Migrate connection URL (Prisma 7 removed `url` from the schema)
src/lib/ai/                Provider-agnostic AI client + the 4 AI features
src/lib/                   Shared server-side logic (inventory math, restock/consume, fuzzy match, storage, auth)
src/app/api/                API routes
src/app/                    Pages (App Router)
src/components/             Client components
```
