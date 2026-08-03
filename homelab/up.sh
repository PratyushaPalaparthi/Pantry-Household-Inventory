#!/usr/bin/env bash
#
# Brings the whole thing up from nothing:
#
#   ./up.sh
#
# Safe to re-run. Every step checks whether it already did its work, so this is
# both the first-time installer and the everyday "start everything" command.

set -euo pipefail
cd "$(dirname "$0")"

DOMAIN="${DOMAIN:-home.localhost}"
say() { printf "\033[1;32m==>\033[0m %s\n" "$1"; }
warn() { printf "\033[1;33m !\033[0m %s\n" "$1"; }

# ---------------------------------------------------------------- secrets ---
if [ ! -f .env ]; then
  say "Generating secrets (.env)"
  {
    echo "AUTHELIA_JWT_SECRET=$(openssl rand -hex 32)"
    echo "AUTHELIA_SESSION_SECRET=$(openssl rand -hex 32)"
    echo "AUTHELIA_STORAGE_ENCRYPTION_KEY=$(openssl rand -hex 32)"
    echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
    echo "AUTH_SECRET=$(openssl rand -base64 32)"
    echo 'CF_TUNNEL_TOKEN=""'
  } > .env
else
  say "Using existing .env"
fi

# Anything referenced below that .env may predate.
for kv in "POSTGRES_PASSWORD=$(openssl rand -hex 16)" "AUTH_SECRET=$(openssl rand -base64 32)" 'CF_TUNNEL_TOKEN=""'; do
  key="${kv%%=*}"
  grep -q "^${key}=" .env || echo "$kv" >> .env
done

# ------------------------------------------------------------------ users ---
if [ ! -f authelia/users.yml ]; then
  warn "No login exists yet. Create one with:"
  echo "     ./adduser.sh <username> <email>"
  exit 1
fi

# ------------------------------------------------------------ certificate ---
# Only needed for direct local access. Through a Cloudflare Tunnel, Cloudflare
# terminates TLS and this is never presented to a browser.
if [ ! -f traefik/certs/local-cert.pem ]; then
  say "Generating a local development certificate"
  mkdir -p traefik/certs
  openssl req -x509 -newkey rsa:2048 -nodes -days 825 \
    -keyout traefik/certs/local-key.pem -out traefik/certs/local-cert.pem \
    -subj "/CN=${DOMAIN}" \
    -addext "subjectAltName=DNS:${DOMAIN},DNS:*.${DOMAIN},DNS:localhost" >/dev/null 2>&1
fi

# --------------------------------------------------------------- network ----
# Shared so each app's own compose file can join with a one-line override,
# instead of every service being merged into one giant file.
docker network inspect edge >/dev/null 2>&1 || {
  say "Creating the shared 'edge' network"
  docker network create edge >/dev/null
}

# ------------------------------------------------------------------ apps ----
# Each app stays in its own repository and can still be run standalone.
mkdir -p apps

if [ ! -d apps/pantry ]; then
  say "Cloning Pantry"
  git clone -q https://github.com/PratyushaPalaparthi/Pantry-Household-Inventory.git apps/pantry
fi

if [ ! -d apps/photovault ]; then
  if [ -d "$HOME/Desktop/photo-webapp" ]; then
    say "Linking PhotoVault from ~/Desktop/photo-webapp"
    ln -s "$HOME/Desktop/photo-webapp" apps/photovault
  else
    say "Cloning PhotoVault"
    git clone -q https://github.com/suryaprakashreddyadapa/photo-webapp.git apps/photovault
  fi
fi

# Pantry needs its own .env; reuse the secrets already generated here so there
# is only ever one place to look.
if [ ! -f apps/pantry/.env ]; then
  say "Configuring Pantry"
  cp apps/pantry/.env.example apps/pantry/.env
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
  python3 - "$POSTGRES_PASSWORD" "$AUTH_SECRET" "$DOMAIN" <<'PY'
import re, sys, pathlib
pw, secret, domain = sys.argv[1], sys.argv[2], sys.argv[3]
p = pathlib.Path("apps/pantry/.env"); s = p.read_text()
s = re.sub(r'POSTGRES_PASSWORD="[^"]*"', f'POSTGRES_PASSWORD="{pw}"', s)
s = re.sub(r'AUTH_SECRET="[^"]*"', f'AUTH_SECRET="{secret}"', s)
s = re.sub(r'NEXTAUTH_URL="[^"]*"', f'NEXTAUTH_URL="https://pantry.{domain}"', s)
s = re.sub(r'TRUSTED_PROXY_HOPS="[^"]*"', 'TRUSTED_PROXY_HOPS="1"', s)
p.write_text(s)
PY
fi

# ----------------------------------------------------------------- start ----
say "Starting everything"
docker compose up -d --build

say "Waiting for services"
for _ in $(seq 1 60); do
  if docker compose ps --format '{{.Service}} {{.Status}}' | grep -q "authelia.*healthy"; then break; fi
  sleep 2
done

echo
say "Up. Open https://${DOMAIN}"
echo
echo "     That is the only address you need — it sends you to the login page"
echo "     and back again. Visiting auth.${DOMAIN} directly just shows a status"
echo "     page, because there is nowhere for it to return you to."
echo
docker compose ps --format "table {{.Service}}\t{{.Status}}"
