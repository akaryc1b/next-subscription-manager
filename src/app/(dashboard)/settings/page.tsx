'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Key,
  Github,
  Terminal,
  UserCog,
  AlertTriangle,
  Check,
  Plus,
  Palette,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { useTheme } from '@/components/theme-provider';

/**
 * Terminal CLI Settings Page
 *
 * 设计特点:
 * - 命令行风格认证方式列表
 * - ASCII 状态指示器
 * - 终端风格操作按钮
 */

interface AuthMethod {
  type: string;
  enabled: boolean;
  email?: string;
  createdAt: string;
}

// 获取认证方式图标
function getMethodIcon(type: string) {
  switch (type) {
    case 'password':
      return <Shield className="h-4 w-4" />;
    case 'passkey':
      return <Key className="h-4 w-4" />;
    case 'github':
      return <Github className="h-4 w-4" />;
    default:
      return null;
  }
}

// 获取认证方式名称
function getMethodName(type: string) {
  switch (type) {
    case 'password':
      return 'PASSWORD';
    case 'passkey':
      return 'PASSKEY';
    case 'github':
      return 'GITHUB';
    default:
      return type.toUpperCase();
  }
}

// 格式化日期
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SettingsPage() {
  const { data: session } = authClient.useSession();
  const { mode, style, setMode, setStyle } = useTheme();
  const searchParams = useSearchParams();
  const [methods, setMethods] = useState<AuthMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (session?.user?.id) {
      fetchAuthMethods();
    }

    // 处理URL参数
    const errorParam = searchParams.get('error');
    const successParam = searchParams.get('success');

    if (errorParam) {
      const errorMessages: Record<string, string> = {
        invalid_request: 'Invalid request',
        invalid_state: 'Security verification failed, please retry',
        not_authenticated: 'Please login first',
        session_expired: 'Session expired, please login again',
        token_exchange_failed: 'GitHub authorization failed',
        failed_to_get_user: 'Failed to get GitHub user info',
        account_already_linked: 'This GitHub account is already linked to another user',
        callback_failed: 'Binding failed, please retry',
      };
      setError(errorMessages[errorParam] || 'Operation failed');
    }

    if (successParam === 'github_linked') {
      setSuccess('GitHub account linked successfully!');
      // 刷新认证方式列表
      if (session?.user?.id) {
        fetchAuthMethods();
      }
    }
  }, [session, searchParams]);

  const fetchAuthMethods = async () => {
    try {
      const res = await fetch(
        `/api/users/${session?.user?.id}/auth-methods`
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setMethods(data.methods);
      }
    } catch (err) {
      setError('Failed to fetch auth methods');
    } finally {
      setLoading(false);
    }
  };

  const handleBindPasskey = async () => {
    setError('');
    setSuccess('');
    try {
      const { error } = await authClient.passkey.addPasskey();
      if (error) {
        setError(error.message || 'Passkey binding failed');
      } else {
        setSuccess('Passkey bound successfully!');
        fetchAuthMethods();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.name === 'NotSupportedError') {
          setError('Your browser does not support Passkey');
        } else if (err.name === 'NotAllowedError') {
          setError('Passkey binding cancelled');
        } else {
          setError(err.message || 'Passkey binding failed, please retry');
        }
      } else {
        setError('Passkey binding failed, please retry');
      }
    }
  };

  const handleBindGithub = async () => {
    setError('');
    setSuccess('');
    try {
      await authClient.linkSocial({
        provider: 'github',
        callbackURL: '/settings',
      });
    } catch (err) {
      setError('GitHub binding failed, please retry');
    }
  };

  const handleUnbind = async (type: string) => {
    if (!confirm(`Are you sure you want to unbind ${getMethodName(type)}?`))
      return;

    try {
      const res = await fetch(
        `/api/users/${session?.user?.id}/auth-methods/${type}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(`${getMethodName(type)} unbound successfully`);
        fetchAuthMethods();
      }
    } catch (err) {
      setError('Unbind failed');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Terminal className="h-8 w-8 text-accent-primary animate-pulse" />
        <div className="text-foreground-secondary text-sm font-mono">
          Loading user settings...
          <span className="terminal-cursor ml-1" />
        </div>
      </div>
    );
  }

  // 已绑定和未绑定的方法
  const boundMethods = methods;
  const unboundMethods = ['passkey', 'github'].filter(
    (type) => !methods.find((m) => m.type === type)
  );

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
      {/* 头部 */}
      <div>
        <h1 className="text-xl lg:text-2xl font-bold tracking-wider uppercase flex items-center gap-2">
          <span className="text-foreground-muted">{'>'}</span>
          USER SETTINGS
        </h1>
        <p className="text-xs lg:text-sm text-foreground-secondary mt-1">
          <span className="hidden sm:inline">$ vi ~/.authrc | </span>Manage authentication methods
        </p>
      </div>

      {/* 错误信息 */}
      {error && (
        <div className="border border-accent-error bg-accent-error/10 p-3 text-sm text-accent-error flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>
            <span className="text-foreground-muted">[</span>
            ERROR
            <span className="text-foreground-muted">]</span> {error}
          </span>
        </div>
      )}

      {/* 成功信息 */}
      {success && (
        <div className="border border-accent-success bg-accent-success/10 p-3 text-sm text-accent-success flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>
            <span className="text-foreground-muted">[</span>
            OK
            <span className="text-foreground-muted">]</span> {success}
          </span>
        </div>
      )}

      {/* 已绑定的认证方式 */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">+---</span>
            <UserCog className="h-4 w-4" />
            BOUND AUTHENTICATION METHODS
            <span className="text-foreground-muted">---+</span>
          </CardTitle>
          <CardDescription className="text-xs font-mono mt-1">
            You can use any of these methods to login
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {boundMethods.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted font-mono text-sm">
              <p>No authentication methods found</p>
              <p className="text-xs mt-1">$ echo "Please bind at least one method"</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {boundMethods.map((method, index) => (
                <div
                  key={method.type}
                  className="flex items-center justify-between p-4 hover:bg-background-hover transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* 序号 */}
                    <span className="text-foreground-muted font-mono text-sm w-6">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    {/* 图标 */}
                    <span className="text-accent-primary">
                      {getMethodIcon(method.type)}
                    </span>

                    {/* 信息 */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {getMethodName(method.type)}
                        </span>
                        <span className="text-accent-success text-xs">
                          [ENABLED]
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted font-mono mt-0.5">
                        {method.email
                          ? `email: ${method.email}`
                          : `bound: ${formatDate(method.createdAt)}`}
                      </p>
                    </div>
                  </div>

                  {/* 解绑按钮 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnbind(method.type)}
                    disabled={boundMethods.length <= 1}
                    className={
                      boundMethods.length <= 1
                        ? 'text-foreground-muted cursor-not-allowed'
                        : 'hover:text-accent-error'
                    }
                    title={
                      boundMethods.length <= 1
                        ? 'Cannot unbind last method'
                        : 'Unbind'
                    }
                  >
                    {boundMethods.length <= 1 ? '[ LOCKED ]' : '[ UNBIND ]'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 绑定新的认证方式 */}
      {unboundMethods.length > 0 && (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-foreground-muted">+---</span>
              <Plus className="h-4 w-4" />
              BIND NEW METHOD
              <span className="text-foreground-muted">---+</span>
            </CardTitle>
            <CardDescription className="text-xs font-mono mt-1">
              Add more login methods to improve account security
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {unboundMethods.includes('passkey') && (
              <Button
                variant="outline"
                className="w-full justify-start font-mono"
                onClick={handleBindPasskey}
              >
                <Key className="mr-2 h-4 w-4" />
                $ bind --passkey
              </Button>
            )}
            {unboundMethods.includes('github') && (
              <Button
                variant="outline"
                className="w-full justify-start font-mono"
                onClick={handleBindGithub}
              >
                <Github className="mr-2 h-4 w-4" />
                $ bind --github
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 主题设置 */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">+---</span>
            <Palette className="h-4 w-4" />
            THEME SETTINGS
            <span className="text-foreground-muted">---+</span>
          </CardTitle>
          <CardDescription className="text-xs font-mono mt-1">
            Customize appearance and visual style
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* 明暗模式切换 */}
          <div>
            <div className="text-sm font-mono text-foreground-secondary mb-2">
              <span className="text-foreground-muted">$</span> theme --mode
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={mode === 'light' ? 'primary' : 'outline'}
                className="font-mono justify-start"
                onClick={() => setMode('light')}
              >
                <Sun className="mr-2 h-4 w-4" />
                LIGHT
              </Button>
              <Button
                variant={mode === 'dark' ? 'primary' : 'outline'}
                className="font-mono justify-start"
                onClick={() => setMode('dark')}
              >
                <Moon className="mr-2 h-4 w-4" />
                DARK
              </Button>
            </div>
          </div>

          {/* 风格切换 */}
          <div>
            <div className="text-sm font-mono text-foreground-secondary mb-2">
              <span className="text-foreground-muted">$</span> theme --style
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={style === 'terminal' ? 'primary' : 'outline'}
                className="font-mono justify-start"
                onClick={() => setStyle('terminal')}
              >
                <Terminal className="mr-2 h-4 w-4" />
                TERMINAL
              </Button>
              <Button
                variant={style === 'modern' ? 'primary' : 'outline'}
                className="font-mono justify-start"
                onClick={() => setStyle('modern')}
              >
                <Monitor className="mr-2 h-4 w-4" />
                MODERN
              </Button>
            </div>
          </div>

          {/* 当前配置 */}
          <div className="border border-border p-3 font-mono text-xs bg-background-secondary">
            <div className="text-foreground-muted mb-1">Current config:</div>
            <div className="text-accent-primary">
              mode={mode} style={style}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 用户信息 */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">+---</span>
            <Terminal className="h-4 w-4" />
            SESSION INFO
            <span className="text-foreground-muted">---+</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 font-mono text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">user:</span>
              <span className="text-accent-info">
                {session?.user?.name || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">email:</span>
              <span className="text-accent-primary">
                {session?.user?.email || 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">id:</span>
              <span className="text-foreground-secondary text-xs">
                {session?.user?.id || 'N/A'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 底部状态栏 */}
      <div className="border border-border p-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2 text-foreground-muted">
          <span className="text-accent-success">●</span>
          <span className="hidden sm:inline">SESSION STATUS: ACTIVE</span>
          <span className="sm:hidden">ACTIVE</span>
          <span className="hidden sm:inline mx-2">|</span>
          <span>METHODS: {boundMethods.length}</span>
          <span className="mx-2">|</span>
          <span>
            <span className="hidden sm:inline">SECURITY LEVEL: </span>
            <span className="sm:hidden">LEVEL: </span>
            {boundMethods.length >= 2 ? (
              <span className="text-accent-success">HIGH</span>
            ) : (
              <span className="text-accent-warning">MEDIUM</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
