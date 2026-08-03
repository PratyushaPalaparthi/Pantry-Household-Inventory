#!/usr/bin/env bash
#
# Creates or replaces a login:
#
#   ./adduser.sh surya you@example.com
#
# The password is read from the terminal, never from the command line, so it
# does not end up in your shell history or the process list.

set -euo pipefail
cd "$(dirname "$0")"

USERNAME="${1:-}"
EMAIL="${2:-}"

if [ -z "$USERNAME" ] || [ -z "$EMAIL" ]; then
  echo "Usage: ./adduser.sh <username> <email>"
  exit 1
fi

read -rsp "Password for ${USERNAME}: " PASSWORD; echo
read -rsp "Confirm: " CONFIRM; echo
[ "$PASSWORD" = "$CONFIRM" ] || { echo "Passwords didn't match. Nothing changed."; exit 1; }
[ "${#PASSWORD}" -ge 8 ] || { echo "Use at least 8 characters. Nothing changed."; exit 1; }

echo "Hashing..."
HASH=$(docker run --rm authelia/authelia:4.39 \
  authelia crypto hash generate argon2 --password "$PASSWORD" 2>/dev/null \
  | grep -o '\$argon2id\$.*')

[ -n "$HASH" ] || { echo "Failed to hash the password. Nothing changed."; exit 1; }

mkdir -p authelia
[ -f authelia/users.yml ] || echo "users: {}" > authelia/users.yml

python3 - "$USERNAME" "$EMAIL" "$HASH" <<'PY'
import sys, pathlib, re
user, email, hash_ = sys.argv[1], sys.argv[2], sys.argv[3]
p = pathlib.Path("authelia/users.yml")
s = p.read_text()
if s.strip() in ("", "users: {}"):
    s = "users:\n"

# Replace an existing block for this user rather than appending a duplicate,
# which Authelia would reject as invalid YAML.
pattern = re.compile(rf"^  {re.escape(user)}:\n(?:    .*\n|      .*\n)*", re.M)
block = (
    f"  {user}:\n"
    f"    disabled: false\n"
    f'    displayname: "{user}"\n'
    f'    password: "{hash_}"\n'
    f"    email: {email}\n"
    f"    groups:\n"
    f"      - admins\n"
)
s = pattern.sub(block, s) if pattern.search(s) else s.rstrip("\n") + "\n" + block
p.write_text(s)
print(f"  {user} written to authelia/users.yml")
PY

# Authelia watches this file, so a running instance picks it up immediately.
echo "Done."
