'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Github, Key, Loader2, Layers3 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setError(result.error.message || 'Authentication failed');
      } else if (result.data) {
        router.push('/dashboard');
      }
    } catch {
      setError('Connection error. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await authClient.signIn.passkey();

      if (result.error) {
        setError(result.error.message || 'Passkey authentication failed');
      } else if (result.data) {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'NotSupportedError') {
          setError('Passkey not supported by browser');
        } else if (err.name === 'NotAllowedError') {
          setError('Passkey authentication cancelled');
        } else {
          setError('Passkey authentication failed');
        }
      } else {
        setError('Passkey authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: 'github',
        callbackURL: '/dashboard',
      });

      if (result?.error) {
        const errorMsg = result.error.message?.toLowerCase() || '';
        if (errorMsg.includes('user') || errorMsg.includes('account') || errorMsg.includes('signup')) {
          setError('GitHub account not linked. Please contact administrator.');
        } else {
          setError(result.error.message || 'GitHub authentication failed');
        }
      }
    } catch {
      setError('GitHub authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="liquid-orb left-[-7rem] top-[-7rem] h-96 w-96 bg-background-active" />
      <div className="liquid-orb bottom-[-10rem] right-[-8rem] h-[28rem] w-[28rem] bg-background-active" />

      <div className="relative z-10 grid w-full max-w-6xl gap-6 lg:grid-cols-[1fr_28rem] lg:items-center">
        <section className="hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-background-secondary px-4 py-2 text-sm text-foreground-secondary backdrop-blur-xl">
            <Layers3 className="h-4 w-4 text-accent-primary" />
            Subscription Manager
          </div>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-foreground-primary">
            Sign in to manage subscriptions.
          </h1>
        </section>

        <Card className="mx-auto w-full max-w-md">
          <CardContent className="p-6 sm:p-7">
            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary text-accent-foreground shadow-lg">
                <Layers3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
                <p className="text-sm text-foreground-muted">Sign in to Subscription Manager</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-2xl border border-accent-error bg-background-active p-3 text-sm text-accent-error">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground-secondary">Email</Label>
                <Input id="email" type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground-secondary">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</> : 'Sign in'}
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-foreground-muted">
              <span className="h-px flex-1 bg-border" />
              or continue with
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={handlePasskeyLogin} disabled={loading}>
                <Key className="h-4 w-4" />
                Passkey
              </Button>
              <Button type="button" variant="outline" onClick={handleGithubLogin} disabled={loading}>
                <Github className="h-4 w-4" />
                GitHub
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
