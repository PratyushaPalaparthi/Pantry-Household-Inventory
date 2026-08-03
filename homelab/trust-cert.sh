#!/usr/bin/env bash
#
# Removes the browser's "Your connection isn't private" warning for local access.
#
#   ./trust-cert.sh
#
# The warning is not a misconfiguration — it is the browser correctly reporting
# that it has never seen the certificate authority that signed this site. A
# self-signed certificate signs itself, so there is nobody to vouch for it.
#
# The fix is to create a small certificate authority of our own, sign the site
# certificate with it, and tell this Mac to trust that authority. Only this
# machine trusts it, and only for names ending in .home.localhost.
#
# You will be asked for your Mac password: adding a trusted authority is exactly
# the kind of change that should require it.
#
# Not needed at all if you reach the site through a Cloudflare Tunnel —
# Cloudflare presents a publicly trusted certificate.

set -euo pipefail
cd "$(dirname "$0")"

DOMAIN="${DOMAIN:-home.localhost}"
CERTS="traefik/certs"
mkdir -p "$CERTS"

say() { printf "\033[1;32m==>\033[0m %s\n" "$1"; }

# ---- 1. A certificate authority ---------------------------------------------
if [ ! -f "$CERTS/ca-key.pem" ]; then
  say "Creating a local certificate authority"
  openssl req -x509 -newkey rsa:4096 -nodes -days 3650 \
    -keyout "$CERTS/ca-key.pem" -out "$CERTS/ca-cert.pem" \
    -subj "/CN=Homelab Local CA/O=Homelab" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign" >/dev/null 2>&1
fi

# ---- 2. A certificate for the site, signed by it ----------------------------
say "Issuing a certificate for *.${DOMAIN}"
cat > "$CERTS/leaf.cnf" <<EOF
[req]
distinguished_name = dn
[dn]
[ext]
basicConstraints = CA:FALSE
keyUsage = critical,digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = DNS:${DOMAIN},DNS:*.${DOMAIN},DNS:localhost,IP:127.0.0.1
EOF

openssl req -newkey rsa:2048 -nodes \
  -keyout "$CERTS/local-key.pem" -out "$CERTS/leaf.csr" \
  -subj "/CN=${DOMAIN}" >/dev/null 2>&1

openssl x509 -req -in "$CERTS/leaf.csr" \
  -CA "$CERTS/ca-cert.pem" -CAkey "$CERTS/ca-key.pem" -CAcreateserial \
  -out "$CERTS/local-cert.pem" -days 825 \
  -extfile "$CERTS/leaf.cnf" -extensions ext >/dev/null 2>&1

rm -f "$CERTS/leaf.csr" "$CERTS/leaf.cnf"

# ---- 3. Trust the authority on this Mac -------------------------------------
if [ "$(uname)" = "Darwin" ]; then
  say "Adding the authority to your login keychain (asks for your password)"
  security add-trusted-cert -d -r trustRoot \
    -k "$HOME/Library/Keychains/login.keychain-db" "$CERTS/ca-cert.pem"
else
  say "Not macOS — trust $CERTS/ca-cert.pem in your OS or browser manually."
fi

say "Restarting Traefik to pick up the new certificate"
docker compose restart traefik >/dev/null 2>&1 || true

echo
say "Done. Quit and reopen your browser, then visit https://${DOMAIN}"
echo "     The warning should be gone."
echo
echo "     On your iPhone: reaching the site through a Cloudflare Tunnel needs"
echo "     none of this, because Cloudflare presents a publicly trusted"
echo "     certificate. Trusting this authority only affects this Mac."
