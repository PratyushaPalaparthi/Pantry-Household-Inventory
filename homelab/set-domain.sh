#!/usr/bin/env bash
#
# Switches the whole stack from one domain to another:
#
#   ./set-domain.sh mygatewaylabs.com
#
# Three files have to agree or single sign-on fails in ways that look unrelated:
# Traefik's routers decide what is reachable, Authelia's access control decides
# what is protected, and Authelia's cookie domain decides whether one login
# carries across the subdomains at all.
#
# Re-runnable: it rewrites whatever domain is currently configured.

set -euo pipefail
cd "$(dirname "$0")"

NEW="${1:-}"
if [ -z "$NEW" ]; then
  echo "Usage: ./set-domain.sh <domain>"
  echo "   e.g. ./set-domain.sh mygatewaylabs.com"
  exit 1
fi

# A cookie domain must contain a period; browsers reject single-label domains
# outright, and the failure shows up as "logged in but immediately logged out"
# rather than as a configuration error.
case "$NEW" in
  *.*) ;;
  *) echo "Refusing: '$NEW' has no dot, so it cannot carry a session cookie."; exit 1 ;;
esac

CURRENT=$(grep -oE 'Host\(`[a-z0-9.-]*`\)' traefik/dynamic/routes.yml \
  | head -1 | sed -E 's/.*`(.*)`.*/\1/')
# The portal sits at the bare domain; apps are subdomains of it.
OLD="${CURRENT#auth.}"

if [ "$OLD" = "$NEW" ]; then
  echo "Already set to $NEW."
  exit 0
fi

echo "==> $OLD  ->  $NEW"

python3 - "$OLD" "$NEW" <<'PY'
import pathlib, sys
old, new = sys.argv[1], sys.argv[2]
for f in [
    "traefik/dynamic/routes.yml",
    "authelia/configuration.yml",
    "portal/index.html",
    "portal/settings.html",
]:
    p = pathlib.Path(f)
    if not p.exists():
        continue
    s = p.read_text()
    if old in s:
        p.write_text(s.replace(old, new))
        print(f"    {f}")
PY

# Behind Cloudflare the client's address arrives via CF-Connecting-IP, and
# X-Forwarded-For has picked up an extra hop. Getting this wrong lets a caller
# forge their apparent address and slip past the login lockout.
if grep -q "^TRUSTED_PROXY_HOPS=" .env 2>/dev/null; then
  sed -i '' "s/^TRUSTED_PROXY_HOPS=.*/TRUSTED_PROXY_HOPS=2/" .env
else
  echo "TRUSTED_PROXY_HOPS=2" >> .env
fi
echo "    .env (TRUSTED_PROXY_HOPS=2, for Cloudflare + tunnel)"

# Pantry builds its callback URLs from this.
if [ -f apps/pantry/.env ]; then
  sed -i '' -E "s#^NEXTAUTH_URL=.*#NEXTAUTH_URL=\"https://pantry.${NEW}\"#" apps/pantry/.env
  echo "    apps/pantry/.env (NEXTAUTH_URL)"
fi

cat <<EOF

Done. Next:

  1. Put your tunnel token in .env as CF_TUNNEL_TOKEN
  2. In Cloudflare, add a public hostname per app, each -> http://traefik:80
         ${NEW}          auth.${NEW}
         pantry.${NEW}   photos.${NEW}
  3. docker compose --profile tunnel up -d --build

Local access via the old domain stops working after this, which is expected:
the session cookie is now issued for ${NEW}.
EOF
