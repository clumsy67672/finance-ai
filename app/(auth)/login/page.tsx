import Link from 'next/link';
import AuthForm from '@/components/auth-form';
import BrandLogo from '@/components/brand-logo';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/');
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="card !p-8 w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo />
          <p className="text-sm text-slate-600">Chat Ledger</p>
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
          <p className="text-sm text-slate-600">Sign in to manage your shared ledger.</p>
        </div>
        <AuthForm mode="login" />
        <p className="mt-6 text-center text-sm text-slate-600">
          Need an account?{' '}
          <Link href="/register" className="font-medium text-slate-900">
            Register
          </Link>
        </p>
      </div>
    </section>
  );
}
