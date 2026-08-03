# Homelab

One website, one login, every app.

Each app keeps its own repository and database. This adds only the layer in
front of them — a single entry point, a single sign-on server, a home page, and
a shared stylesheet — so any app can still be developed and run on its own.

```
                    ┌── home.example.com     portal + settings
 you ──▶ Traefik ───┼── pantry.example.com   Pantry
         (+ Authelia)└── photos.example.com  PhotoVault
```

## Start it

```bash
./adduser.sh surya you@example.com   # first time only
./up.sh
```

`up.sh` is safe to re-run — it is both the installer and the everyday start
command. It generates secrets, clones any missing app, writes each app's config,
creates the shared network, and starts everything.

Add the local AI models for Pantry's receipt parsing (~9.4 GB, opt-in):

```bash
docker compose --profile ai up -d
```

## How single sign-on works

Traefik pauses every request and asks Authelia "is this caller signed in?" If
not, they are sent to one login page. If yes, the request continues with
`Remote-User` and `Remote-Email` headers naming them.

That is why apps in different languages can share one login without knowing
about each other. Pantry reads those headers directly (`TRUST_PROXY_AUTH=true`)
so it never shows its own login screen.

**This depends on the apps being unreachable except through Traefik.** No app
publishes a host port. If you expose one directly, anyone could send a
`Remote-Email` header and become any user — so turn `TRUST_PROXY_AUTH` off if
you ever do that.

## Reaching it from your phone

Cloudflare Tunnel is the shortest path, and it removes certificate management
entirely: Cloudflare terminates TLS at its edge and the tunnel dials outward, so
no router port is opened and nothing needs renewing.

1. Create a tunnel in the [Zero Trust dashboard](https://one.dash.cloudflare.com)
2. Put the token in `.env` as `CF_TUNNEL_TOKEN`
3. Add a public hostname per app, each pointing at `http://traefik:80`
4. Run `docker compose --profile tunnel up -d`

Then add it to your home screen from Safari: Share → Add to Home Screen.

## Adding an app

Four files, by design — there is no hidden registry:

| File | What to add |
| --- | --- |
| `portal/apps.js` | a card, so it appears on the home and settings pages |
| `traefik/dynamic/routes.yml` | a router and a service |
| `authelia/configuration.yml` | its hostname, so it is access-controlled |
| `docker-compose.yml` | the service itself |

## Making an app look like the rest

Every page links `/theme.css` from the portal. Change a colour there and it
changes everywhere. Without one source of truth, five apps drift into five
different greens and the illusion of one product breaks the moment you click a
card.

## Going to production

Replace `home.localhost` with your real domain in `traefik/dynamic/routes.yml`,
`authelia/configuration.yml`, and the `session.cookies` block. The cookie domain
**must contain a period** — plain `localhost` is rejected outright, which is why
local development uses `home.localhost` rather than bare `*.localhost`.

## Layout

```
docker-compose.yml     the whole stack
up.sh                  one-command bootstrap
adduser.sh             create a login
traefik/dynamic/       routing and TLS
authelia/              SSO config and users (users.yml is git-ignored)
portal/                home page, settings page, shared theme.css
apps/                  each app, cloned or symlinked
```
