import type { Metadata } from 'next';
import { ParlonMark } from '@/components/brand/parlon-logo';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Operator sign in' };

export default function PlatformLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
            <ParlonMark className="h-6 w-6 text-white" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight text-white">Parlon Platform</h1>
          <p className="mt-1 text-xs text-stone-400">Operator console — not for salon staff.</p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-pop">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-2xs text-stone-500">
          Every action here is written to the audit trail.
        </p>
      </div>
    </main>
  );
}
