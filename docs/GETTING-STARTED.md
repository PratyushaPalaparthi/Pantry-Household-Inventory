# Getting started: from a clean machine to an app on your iPhone

Start-to-finish setup, including what it costs to run. Every command here was run
against a fresh clone of this repository.

- [1. What you need first](#1-what-you-need-first)
- [2. Get the code](#2-get-the-code)
- [3. Configure it](#3-configure-it)
- [4. Start it](#4-start-it)
- [5. Create your account](#5-create-your-account)
- [6. Reach it from anywhere](#6-reach-it-from-anywhere)
- [7. Install it on your iPhone](#7-install-it-on-your-iphone)
- [8. What it costs](#8-what-it-costs)
- [9. Keeping it running](#9-keeping-it-running)

---

## 1. What you need first

**Docker Desktop** (Mac/Windows) or Docker Engine (Linux) — this is the only
requirement. Node, Postgres, and Ollama all run inside containers; nothing is
installed on the host.

**Hardware.** The AI features run a 7-billion-parameter model locally, which sets
the floor:

| | Minimum | Comfortable |
|---|---|---|
| RAM | 8 GB | 16 GB |
| Free disk | 20 GB | 30 GB |

At 8 GB only one model stays resident, so switching between receipt parsing and
photo-to-item makes Ollama reload the other model each time — it works, it is
just slow. At 16 GB both stay loaded.

Disk goes mostly on the two models (9.4 GB) and the app image (1.7 GB).

---

## 2. Get the code

```bash
git clone https://github.com/PratyushaPalaparthi/Pantry-Household-Inventory.git
cd Pantry-Household-Inventory
```

---

## 3. Configure it

The repository deliberately ships no `.env` — it holds secrets. Create yours from
the template:

```bash
cp .env.example .env
```

Now generate a real session secret. This signs your login cookie; leaving the
placeholder would let anyone forge a session:

```bash
openssl rand -base64 32
```

Open `.env` and set two values:

- `AUTH_SECRET` — paste the string you just generated
- `POSTGRES_PASSWORD` — any strong password; you never type it by hand

Everything else works as shipped. Leave `NEXTAUTH_URL` as `http://localhost:3000`
for now — you will change it in step 6.

---

## 4. Start it

```bash
docker compose up -d --build
```

The first run takes a while: it builds the app image, then downloads
**about 9.4 GB of models** (`qwen2.5:7b` for receipts and language, `llava:7b`
for photo recognition). Expect 10–30 minutes depending on your connection.
Later starts are seconds.

Watch the model download:

```bash
docker compose logs -f ollama-init
```

Check everything is healthy:

```bash
docker compose ps
```

You want `app` up, `db` and `ollama` healthy, and `ollama-init` exited (it is a
one-shot downloader — exiting is success).

Open **http://localhost:3000**.

---

## 5. Create your account

Go to `/signup`. **The first account becomes the owner and signup then closes
permanently** — this is what stops anyone who finds your app from creating their
own login.

There is no email password reset. If you forget it:

```bash
docker compose exec app npm run set-password
```

---

## 6. Reach it from anywhere

Two hard requirements once you leave localhost:

1. **HTTPS is mandatory.** Not only for privacy — the barcode scanner needs the
   camera, and browsers only allow camera access on a secure origin. Over plain
   HTTP the scanner silently fails and iOS will not install the app properly.
2. **`NEXTAUTH_URL` must be your real public address**, or login fails from every
   device except the machine it runs on.

The app is bound to `127.0.0.1:3000` on purpose, so nothing is exposed until you
deliberately put something in front of it.

### Tailscale — free, private, recommended

Only your own devices can reach the app. Nothing is published to the internet, so
there is no attack surface to defend.

1. Install Tailscale on the host machine and on your iPhone, signed into the same
   account. The free plan covers 100 devices.
2. Enable [HTTPS](https://tailscale.com/kb/1153/enabling-https) in the Tailscale
   admin console. This gives you a real certificate, which the camera requires.
3. Your machine gets a stable name like `myhost.tailnet-name.ts.net`.
4. Point the app at it — edit `.env`:

   ```
   NEXTAUTH_URL="https://myhost.tailnet-name.ts.net"
   TRUSTED_PROXY_HOPS="1"
   ```

5. Serve it over TLS and restart:

   ```bash
   sudo tailscale serve --bg 3000
   docker compose up -d
   ```

### Cloudflare Tunnel — a real public URL

Use this only if other people need access. It puts your login page in front of
the entire internet, where it will be scanned constantly. Requires your own
domain (~$10–15/year). See the "Exposing it over the internet" section of the
main README, and set `TRUSTED_PROXY_HOPS="2"` because Cloudflare adds a hop.

---

## 7. Install it on your iPhone

Once you have an HTTPS address:

1. Open it in **Safari** (this does not work from Chrome on iOS).
2. Tap **Share** → **Add to Home Screen**.
3. Name it and tap **Add**.

You get a real app icon, no Safari chrome, its own entry in the app switcher, and
a working camera for barcode scanning.

This costs nothing and never expires — unlike a sideloaded native app, which
needs re-signing every 7 days without a $99/year Apple Developer account.

Two honest limits: you will log in again roughly monthly (sessions last 30 days),
and there are no low-stock push notifications yet.

---

## 8. What it costs

### Running it at home — a few dollars a month

The only real cost is electricity for keeping the machine on.

| Host | Typical draw | Monthly electricity* |
|---|---|---|
| Mac mini / small PC | ~15 W average | **$2–3** |
| Synology NAS | ~25 W average | **$3–4** |
| Laptop left plugged in | ~20 W average | **$2–4** |

<sub>*At roughly $0.17/kWh. Scale to your own rate: watts × 24 × 30 ÷ 1000 × rate.</sub>

Everything else is free: the software, Docker, Tailscale's free plan, the local
AI models, and the PWA on your phone. **No subscriptions, no per-user fees, no
Apple developer account.**

The catch is that the app is only reachable while that machine is awake. Close a
laptop lid and the icon on your phone opens an error page.

### Renting a server — about $8–15 a month

Worth it only if your home power or internet is unreliable, or you want it
reachable while everything at home is off.

| Provider | Spec | Cost |
|---|---|---|
| Hetzner CX32 | 4 vCPU / 8 GB / 80 GB | ~€7/mo (~$8) |
| Hetzner CX42 | 8 vCPU / 16 GB / 160 GB | ~€14/mo (~$15) |
| DigitalOcean / Linode | 8 GB equivalent | $40–50/mo |

Hetzner is the outlier on price for this workload; the others charge several
times more for the RAM the models need. The same `docker compose up -d` runs
there unchanged.

### Optional extras

- **Domain name** — $10–15/year, only if you use Cloudflare Tunnel. Tailscale
  needs none.
- **Claude API instead of local models** — set `AI_PROVIDER=claude` if you would
  rather not run Ollama (it drops the RAM requirement to about 1 GB). This adds
  usage-based cost and sends receipt images to Anthropic, which is the thing
  local models avoid. Check current rates at
  [anthropic.com/pricing](https://www.anthropic.com/pricing).

---

## 9. Keeping it running

**Back up your data.** This is the one thing that actually matters — everything
else is reinstallable. Two options:

- Settings → Export in the app, for a JSON or CSV snapshot you can read anywhere.
- A full database dump:

  ```bash
  docker compose exec -T db pg_dump -U inventory inventory > backup-$(date +%F).sql
  ```

Uploaded photos live in the `uploads` Docker volume and are not covered by the
SQL dump.

**Updating:**

```bash
git pull
docker compose up -d --build
```

Schema migrations run automatically on start.

**Occasionally check for vulnerable dependencies:**

```bash
npm audit
```

**Free up space** if you experimented with other models:

```bash
docker compose exec ollama ollama list
docker compose exec ollama ollama rm <model-you-do-not-use>
```

**If something breaks**, the logs almost always say why:

```bash
docker compose logs app --tail 50
```
