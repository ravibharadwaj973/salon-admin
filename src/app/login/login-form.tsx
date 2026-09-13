'use client';

import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as { error?: { message: string } };

      if (!response.ok) {
        setError(payload.error?.message ?? 'Could not sign you in');
        setLoading(false);
        return;
      }

      // A full page load, not router.replace(). Signing in sets an httpOnly
      // cookie on the server, and every route in the console renders
      // differently once it exists — including the middleware that decides
      // whether you may be here at all. A client-side navigation races the
      // router's own refresh of /login and loses: the cookie is set, but you
      // are handed the sign-in page again and it looks like nothing happened.
      // A hard navigation starts with a clean cache and the cookie attached.
      window.location.replace('/');
    } catch {
      setError('Cannot reach the server.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <h2 className="text-sm font-semibold text-ink">Sign in</h2>
        <p className="mt-0.5 text-xs text-ink-muted">Your session lasts eight hours.</p>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <Field label="Email">
        {({ id }) => (
          <Input
            id={id}
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@salonos.in"
          />
        )}
      </Field>

      <Field label="Password">
        {({ id }) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="w-full" loading={loading}>
        Sign in
      </Button>
    </form>
  );
}
