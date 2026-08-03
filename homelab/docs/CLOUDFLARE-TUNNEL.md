# Publishing the site with a Cloudflare Tunnel

Takes the stack from `home.localhost` on one Mac to `mygatewaylabs.com` reachable
from anywhere, including your phone.

A tunnel is worth understanding before you set one up: `cloudflared` makes an
**outbound** connection to Cloudflare and traffic comes back down it. Nothing
listens for incoming connections, so there is no router port to forward, no
dynamic DNS to maintain, and your home IP address is never published. It also
means the certificate problem disappears entirely — Cloudflare terminates TLS at
its edge with a publicly trusted certificate, which is what your iPhone needs to
install the apps to the home screen and to grant camera access for barcode
scanning.

- [1. Point the domain at Cloudflare](#1-point-the-domain-at-cloudflare)
- [2. Create the tunnel](#2-create-the-tunnel)
- [3. Add a hostname for each app](#3-add-a-hostname-for-each-app)
- [4. Switch the stack to your domain](#4-switch-the-stack-to-your-domain)
- [5. Start it](#5-start-it)
- [6. Put it on your phone](#6-put-it-on-your-phone)
- [Locking it down further](#locking-it-down-further)
- [When something does not work](#when-something-does-not-work)

---

## 1. Point the domain at Cloudflare

Cloudflare has to serve DNS for the domain; a tunnel cannot work through
Porkbun's nameservers.

1. Create a free account at [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Add a site** → `mygatewaylabs.com` → choose the **Free** plan
3. Cloudflare shows two nameservers, something like
   `xxx.ns.cloudflare.com` and `yyy.ns.cloudflare.com`. Copy both.
4. In Porkbun: **Domain Management** → `mygatewaylabs.com` → **Authoritative
   Nameservers** → **Edit** → replace Porkbun's entries with Cloudflare's two →
   save.

Propagation is usually minutes but can take a few hours. Cloudflare emails you
when the domain is active; nothing below works until it is.

---

## 2. Create the tunnel

1. Go to [one.dash.cloudflare.com](https://one.dash.cloudflare.com) (Zero Trust).
   The first visit asks you to pick a team name and a plan — the **Free** plan
   covers up to 50 users.
2. **Networks → Tunnels → Create a tunnel**
3. Choose **Cloudflared**, name it `homelab`, and save.
4. The install screen shows a command containing a very long token. You only need
   the token — the part after `--token`.
5. Put it in `homelab/.env`:

   ```
   CF_TUNNEL_TOKEN="eyJhIjoiN..."
   ```

That token is a credential: anyone holding it can publish traffic through your
tunnel. `.env` is git-ignored for exactly this reason.

---

## 3. Add a hostname for each app

Still in the tunnel's configuration, open the **Published application** (or
*Public hostname*) tab and add one entry per app. All four point at the **same**
place — Traefik decides which app to serve based on the hostname:

| Subdomain | Domain | Type | URL |
| --- | --- | --- | --- |
| *(leave blank)* | mygatewaylabs.com | HTTP | `traefik:80` |
| `auth` | mygatewaylabs.com | HTTP | `traefik:80` |
| `pantry` | mygatewaylabs.com | HTTP | `traefik:80` |
| `photos` | mygatewaylabs.com | HTTP | `traefik:80` |

Two things people get wrong here:

- **Use HTTP, not HTTPS.** The hop from `cloudflared` to Traefik happens inside
  the Docker network on this machine. Cloudflare already encrypted the public
  half; the internal half needs no certificate, and asking for HTTPS makes
  Traefik present its local certificate, which `cloudflared` will reject.
- **`traefik:80`, not `localhost:80`.** Inside a container, `localhost` is that
  container, not the host.

Cloudflare creates the DNS records for you. The blank subdomain is the launcher
itself at the bare domain.

---

## 4. Switch the stack to your domain

Three files have to agree, so this is scripted:

```bash
cd ~/Desktop/homelab
./set-domain.sh mygatewaylabs.com
```

It rewrites Traefik's routers, Authelia's access rules and cookie domain, the
portal's links, and Pantry's callback URL, then sets `TRUSTED_PROXY_HOPS=2`
because Cloudflare adds a hop in front of the tunnel.

After this, `home.localhost` stops working. That is expected — the session cookie
is now issued for `mygatewaylabs.com`, and a cookie cannot span two unrelated
domains.

---

## 5. Start it

```bash
docker compose --profile tunnel up -d --build
```

Check the tunnel connected:

```bash
docker compose logs tunnel | grep -i "registered\|connection"
```

You want lines about registered connections to Cloudflare data centres. The
dashboard should show the tunnel as **Healthy**.

Then open `https://mygatewaylabs.com`. You should get the login page with a valid
certificate and no warning.

---

## 6. Put it on your phone

Open the site in **Safari** (iOS only allows installing from Safari), then
**Share → Add to Home Screen**. Do it for each app you want as its own icon:

- `https://mygatewaylabs.com` — the launcher
- `https://pantry.mygatewaylabs.com`
- `https://photos.mygatewaylabs.com`

Each gets a real icon, no browser chrome, and its own entry in the app switcher.
Sign in once and all of them are unlocked.

Barcode scanning in Pantry needs camera access, which browsers only grant on a
secure origin — that now works, because Cloudflare's certificate is publicly
trusted.

---

## Locking it down further

Your login page is now exposed to the whole internet and will be found by
scanners within days. Two free additions worth making:

**Cloudflare Access** (Zero Trust → Access → Applications) puts an identity check
in front of the site, so unauthenticated traffic never reaches your machine at
all. With a one-time-PIN policy to your own email address, an attacker has to get
past Cloudflare before they can even see that Authelia exists.

**Turn on the WAF** and rate limiting for the domain in the main dashboard.

Also change the password if it is still `Test@1234`:

```bash
./adduser.sh surya you@example.com
```

---

## When something does not work

**"Logged in, then immediately logged out"** — the cookie domain does not match
the site. Check `session.cookies[].domain` in `authelia/configuration.yml` is
`mygatewaylabs.com` with no subdomain and no scheme.

**Error 1033, or the tunnel shows as down** — `cloudflared` cannot reach
Cloudflare, or the token is wrong. `docker compose logs tunnel` says which.

**502 from Cloudflare** — the tunnel is up but Traefik is not reachable. Almost
always a hostname entry pointing at `localhost:80` instead of `traefik:80`.

**Redirect loop on the login page** — `auth.mygatewaylabs.com` is missing from the
tunnel's hostnames, so the login page cannot be reached to complete the sign-in.

**Everything 404s** — a Traefik router did not load. `docker compose logs traefik`
will name the file and line. Remember that Traefik runs its dynamic config
through Go templating, so a stray `{{ }}` anywhere in that file, comments
included, fails the whole thing.
