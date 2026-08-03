import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';

/**
 * Signs in automatically when an upstream single sign-on proxy has already
 * authenticated the caller.
 *
 * Without this, arriving from the launcher lands on this app's own login form
 * even though the user signed in seconds ago, and the site stops feeling like
 * one product. The endpoint returns 404 unless the backend has TRUST_PROXY_AUTH
 * enabled, so a standalone deployment is unaffected and falls through to the
 * normal login screen.
 *
 * Returns false while the attempt is in flight, so callers can wait instead of
 * flashing the login form for a moment first.
 */
export function useSsoBootstrap(): boolean {
  const { isAuthenticated, login } = useAuthStore();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setSettled(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/auth/sso-session', {
          method: 'POST',
          credentials: 'include',
        });
        if (!cancelled && res.ok) {
          const tokens = await res.json();
          const me = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          });
          if (me.ok) {
            login(await me.json(), tokens.access_token, tokens.refresh_token);
          }
        }
      } catch {
        // No proxy identity, or the endpoint is disabled. Falling through to
        // the normal login screen is the correct behaviour.
      } finally {
        if (!cancelled) setSettled(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, login]);

  return settled;
}
