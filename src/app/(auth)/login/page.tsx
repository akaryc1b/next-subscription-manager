'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { Github, Key, Terminal, Loader2 } from 'lucide-react';

/**
 * Terminal CLI Login Page
 *
 * 设计特点:
 * - ASCII Art Logo
 * - 命令行风格输入
 * - 打字机效果
 * - 扫描线背景
 */

// ASCII Art Logo
const ASCII_LOGO = `
███████╗██╗   ██╗██████╗ ███████╗ ██████╗██████╗ ██╗██████╗ ████████╗██╗ ██████╗ ███╗   ██╗
██╔════╝██║   ██║██╔══██╗██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
███████╗██║   ██║██████╔╝███████╗██║     ██████╔╝██║██████╔╝   ██║   ██║██║   ██║██╔██╗ ██║
╚════██║██║   ██║██╔══██╗╚════██║██║     ██╔══██╗██║██╔═══╝    ██║   ██║██║   ██║██║╚██╗██║
███████║╚██████╔╝██████╔╝███████║╚██████╗██║  ██║██║██║        ██║   ██║╚██████╔╝██║ ╚████║
╚══════╝ ╚═════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝        ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
`;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootText, setBootText] = useState<string[]>([]);

  // 启动动画
  useEffect(() => {
    const bootMessages = [
      '[OK] Initializing system...',
      '[OK] Loading kernel modules...',
      '[OK] Starting network services...',
      '[OK] Connecting to database...',
      '[OK] System ready.',
      '',
      'Subscription Manager v2.2.0',
      'Please authenticate to continue.',
    ];

    let index = 0;
    const timer = setInterval(() => {
      if (index < bootMessages.length) {
        setBootText((prev) => [...prev, bootMessages[index]]);
        index++;
      } else {
        clearInterval(timer);
      }
    }, 150);

    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

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
        // Provide specific error message for unlinked GitHub accounts
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 terminal-scanlines">
      {/* ASCII Logo - 仅在大屏幕显示 */}
      <pre className="hidden lg:block text-[8px] xl:text-[10px] text-accent-primary mb-8 font-mono leading-tight whitespace-pre terminal-glow-strong select-none">
        {ASCII_LOGO}
      </pre>

      {/* 移动端 Logo */}
      <div className="lg:hidden flex items-center gap-3 mb-8">
        <Terminal className="h-8 w-8 text-accent-primary" />
        <span className="text-2xl font-bold tracking-wider uppercase">
          Subscription
        </span>
      </div>

      {/* 启动日志 */}
      <div className="w-full max-w-md mb-6 font-mono text-xs text-foreground-secondary space-y-0.5 h-36 overflow-hidden">
        {bootText.map((text, index) => (
          <div
            key={index}
            className={
              text?.startsWith('[OK]')
                ? 'text-accent-success'
                : text?.includes('v2.2.0')
                  ? 'text-accent-info'
                  : ''
            }
          >
            {text}
          </div>
        ))}
        <span className="terminal-cursor" />
      </div>

      {/* 登录卡片 */}
      <Card className="w-full max-w-md">
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2">
            <span className="text-foreground-muted">+---</span>
            AUTHENTICATION
            <span className="text-foreground-muted">---+</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 错误信息 */}
            {error && (
              <div className="border border-accent-error bg-accent-error/10 p-3 text-sm text-accent-error terminal-glow-error">
                <span className="text-foreground-muted">[</span>
                ERROR
                <span className="text-foreground-muted">]</span> {error}
              </div>
            )}

            {/* 邮箱输入 */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground-secondary text-xs uppercase tracking-wider">
                $ EMAIL
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* 密码输入 */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground-secondary text-xs uppercase tracking-wider">
                $ PASSWORD
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* 登录按钮 */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                '[ LOGIN ]'
              )}
            </Button>

            {/* 分隔线 */}
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border border-dashed" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background-primary px-4 text-foreground-muted">
                  OR
                </span>
              </div>
            </div>

            {/* Passkey 登录 */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handlePasskeyLogin}
              disabled={loading}
            >
              <Key className="h-4 w-4" />
              PASSKEY LOGIN
            </Button>

            {/* GitHub 登录 */}
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={handleGithubLogin}
              disabled={loading}
            >
              <Github className="h-4 w-4" />
              GITHUB LOGIN
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 底部信息 */}
      <div className="mt-8 text-center text-xs text-foreground-muted space-y-1">
        <p>Secure authentication required for system access</p>
        <p className="text-foreground-placeholder">
          © 2026 Subscription | Terminal Mode
        </p>
      </div>
    </div>
  );
}
