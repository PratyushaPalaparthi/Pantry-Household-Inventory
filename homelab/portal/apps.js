// The single registry of apps on this domain.
//
// Both the home page and the settings page render from this list, so an app can
// never show up in one place and be missing from the other. Adding an app means
// touching four files in total: this one, traefik/dynamic/routes.yml (routing),
// authelia/configuration.yml (access control), and docker-compose.yml (service).
//
// `host` is used to build links and to poll each app's health from settings.

// The portal is served at the parent domain and every app is a subdomain of it,
// so the hostname is used as-is. Stripping a leading "home." here was a bug:
// on home.localhost it yielded "localhost", pointing every link and health
// check at pantry.localhost — a host that does not exist.
const DOMAIN = location.hostname;

const APPS = [
  {
    id: "pantry",
    name: "Pantry",
    icon: "🏠",
    description: "Household inventory — what's in stock, what's running low, and what it costs.",
    host: `pantry.${DOMAIN}`,
    url: `${location.protocol}//pantry.${DOMAIN}`,
    settings: [
      { label: "Inventory, receipts, AI provider", href: `${location.protocol}//pantry.${DOMAIN}/settings` },
      { label: "Export all data", href: `${location.protocol}//pantry.${DOMAIN}/settings` },
    ],
  },
  {
    id: "photos",
    name: "PhotoVault",
    icon: "📷",
    description: "Photo library with search, thumbnails, and background processing.",
    host: `photos.${DOMAIN}`,
    url: `${location.protocol}//photos.${DOMAIN}`,
    settings: [{ label: "Library and processing settings", href: `${location.protocol}//photos.${DOMAIN}` }],
  },
];

/**
 * Signs out of every app.
 *
 * Must POST to /api/logout — that is what actually destroys the session.
 * Linking to /logout only loaded Authelia's single-page app shell, which
 * rendered blank under this domain (its asset paths point at the auth
 * subdomain) and, far worse, left the session fully intact: changing the URL
 * afterwards got straight back in.
 */
async function signOut(event) {
  if (event) event.preventDefault();
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
  } catch {
    // Network failure still falls through to the redirect below: the portal is
    // protected, so an unauthenticated browser lands on the login page anyway.
  }
  // Straight to the portal, which bounces to the login page and returns here
  // afterwards. Sending the user to the auth subdomain directly would strand
  // them on a status page with nowhere to go back to.
  window.location.replace(`${location.protocol}//${DOMAIN}/`);
}
