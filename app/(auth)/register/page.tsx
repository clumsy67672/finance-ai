import Link from 'next/link';
import AuthForm from '@/components/auth-form';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/');
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center gap-6 px-6">
      <div className="w-full max-w-md card !p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm text-slate-600">Family Finance Chat Ledger</p>
          <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
          <p className="text-sm text-slate-600">The first user becomes admin automatically.</p>
        </div>
        <AuthForm mode="register" />
        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-slate-900">
            Sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
