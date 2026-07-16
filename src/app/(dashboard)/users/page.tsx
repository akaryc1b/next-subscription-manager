'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  Power,
  Users,
  RefreshCw,
  Terminal,
  Check,
  AlertTriangle,
  Search,
  X,
  Rocket,
  RefreshCcw,
  Settings2,
} from 'lucide-react';
import { DatePicker } from '@/components/ui/date-picker';
import { ResponsiveTable } from '@/components/ui/responsive-table';
import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * Terminal CLI Users Management Page
 *
 * 设计特点:
 * - ASCII 风格表格
 * - 命令行状态标签
 * - 终端风格对话框
 * - 响应式：桌面端表格，移动端卡片
 */

interface User {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isBanned: boolean;
  expiresAt: string | null;
  createdAt: string;
  subscription?: {
    token: string;
    maxAccess: number;
    accessCount: number;
  };
  userConfigs?: {
    configId: string;
  }[];
}

interface Config {
  id: string;
  name: string;
  isActive: boolean;
}

// 生成用户状态标签
function getUserStatusLabel(user: User): {
  text: string;
  className: string;
  icon: 'success' | 'error' | 'warning';
} {
  if (user.isBanned) {
    return {
      text: 'BANNED',
      className: 'text-accent-error',
      icon: 'error',
    };
  }
  if (user.isActive) {
    return {
      text: 'ACTIVE',
      className: 'text-accent-success',
      icon: 'success',
    };
  }
  return {
    text: 'INACTIVE',
    className: 'text-foreground-muted',
    icon: 'warning',
  };
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'user',
    isBanned: false,
    expiresAt: undefined as Date | undefined,
    configIds: [] as string[],
  });
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [copyRocketSuccess, setCopyRocketSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  // 订阅设置对话框状态
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionUser, setSubscriptionUser] = useState<User | null>(null);
  const [subscriptionMaxAccess, setSubscriptionMaxAccess] = useState(20);
  const [resetting, setResetting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isMobile, isHydrated } = useMediaQuery();

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/configs');
      const data = await res.json();
      setConfigs(data.configs);
    } catch (err) {
      console.error('Failed to fetch configs', err);
    }
  };

  const fetchUsers = useCallback(async (search?: string) => {
    setRefreshing(true);
    if (search !== undefined) {
      setSearching(true);
    }
    try {
      const url = search ? `/api/users?search=${encodeURIComponent(search)}` : '/api/users';
      const res = await fetch(url);
      const data = await res.json();
      setUsers(data.users);
    } catch (err) {
      setError('Failed to fetch user list');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setSearching(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      fetchUsers(searchTerm || undefined);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm, fetchUsers]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          expiresAt: formData.expiresAt
            ? formData.expiresAt.toISOString()
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setDialogOpen(false);
      setFormData({
        email: '',
        password: '',
        role: 'user',
        isBanned: false,
        expiresAt: undefined,
        configIds: [],
      });
      fetchUsers(searchTerm || undefined);
    } catch (err) {
      setError('Failed to create user');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    try {
      const updateData = {
        ...formData,
        expiresAt: formData.expiresAt ? formData.expiresAt.toISOString() : null,
      };
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setDialogOpen(false);
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        role: 'user',
        isBanned: false,
        expiresAt: undefined,
        configIds: [],
      });
      fetchUsers(searchTerm || undefined);
    } catch (err) {
      setError('Failed to update user');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers(searchTerm || undefined);
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      fetchUsers(searchTerm || undefined);
    } catch (err) {
      setError('Failed to toggle user status');
    }
  };

  const copySubscriptionLink = (token: string, userId: string) => {
    const link = `${window.location.origin}/api/sub/${token}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(userId);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const copyShadowrocketLink = (token: string, userId: string) => {
    const link = `${window.location.origin}/api/sub/${token}`;
    const base64Link = btoa(link);
    const shadowrocketLink = `sub://${base64Link}`;
    navigator.clipboard.writeText(shadowrocketLink);
    setCopyRocketSuccess(userId);
    setTimeout(() => setCopyRocketSuccess(null), 2000);
  };

  // 打开订阅设置对话框
  const openSubscriptionDialog = (user: User) => {
    setSubscriptionUser(user);
    setSubscriptionMaxAccess(user.subscription?.maxAccess ?? 20);
    setSubscriptionDialogOpen(true);
  };

  // 更新订阅设置
  const handleUpdateSubscription = async () => {
    if (!subscriptionUser) return;
    try {
      const res = await fetch(`/api/users/${subscriptionUser.id}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxAccess: subscriptionMaxAccess }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '更新失败');
        return;
      }
      setSubscriptionDialogOpen(false);
      fetchUsers(searchTerm || undefined);
    } catch (err) {
      setError('更新订阅设置失败');
    }
  };

  // 重置订阅链接
  const handleResetSubscription = async () => {
    if (!subscriptionUser) return;
    if (!confirm('确定要重置订阅链接吗？旧链接将立即失效！')) return;

    setResetting(true);
    try {
      const res = await fetch(`/api/users/${subscriptionUser.id}/subscription/reset`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '重置失败');
        return;
      }
      setSubscriptionDialogOpen(false);
      fetchUsers(searchTerm || undefined);
    } catch (err) {
      setError('重置订阅链接失败');
    } finally {
      setResetting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      role: 'user',
      isBanned: false,
      expiresAt: undefined,
      configIds: [],
    });
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      role: user.role,
      isBanned: user.isBanned,
      expiresAt: user.expiresAt ? new Date(user.expiresAt) : undefined,
      configIds: user.userConfigs?.map((uc) => uc.configId) || [],
    });
    setError('');
    setDialogOpen(true);
  };

  const toggleConfigSelection = (configId: string) => {
    setFormData((prev) => ({
      ...prev,
      configIds: prev.configIds.includes(configId)
        ? prev.configIds.filter((id) => id !== configId)
        : [...prev.configIds, configId],
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 移动端用户卡片渲染
  const renderUserCard = (user: User, index: number) => {
    const status = getUserStatusLabel(user);
    return (
      <div className="border border-border bg-background-secondary p-3 space-y-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-foreground-muted text-xs font-mono">
                #{String(index + 1).padStart(2, '0')}
              </span>
              <span className={status.className + ' text-xs font-mono'}>
                [{status.text}]
              </span>
            </div>
            <div className="text-accent-info font-mono text-sm break-all leading-5">
              {user.email}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => handleToggleActive(user)} className="w-full sm:w-8">
              <Power className={`h-4 w-4 ${user.isActive ? 'text-accent-success' : 'text-foreground-muted'}`} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(user)} className="w-full sm:w-8">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(user.id)} className="w-full hover:text-accent-error sm:w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs font-mono min-[380px]:grid-cols-2">
          <div>
            <span className="text-foreground-muted">ROLE: </span>
            <span className={user.role === 'admin' ? 'text-accent-warning' : 'text-foreground-secondary'}>
              {user.role.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-foreground-muted">EXPIRES: </span>
            <span className="text-foreground-secondary">
              {user.expiresAt ? formatDate(user.expiresAt) : 'PERMANENT'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-foreground-muted">CREATED: </span>
            <span className="text-foreground-secondary">{formatDate(user.createdAt)}</span>
          </div>
        </div>
        {user.subscription?.token && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-foreground-muted">ACCESS:</span>
              <span className="text-foreground-secondary">
                {user.subscription.accessCount}/{user.subscription.maxAccess === 0 ? '∞' : user.subscription.maxAccess}
              </span>
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copySubscriptionLink(user.subscription!.token, user.id)}
                className="h-8 min-w-0 px-2"
              >
                {copySuccess === user.id ? (
                  <><Check className="h-3 w-3 mr-1 text-accent-success" /><span className="text-accent-success text-xs">COPIED</span></>
                ) : (
                  <><Copy className="h-3 w-3 mr-1" /><span className="text-xs">SUB</span></>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyShadowrocketLink(user.subscription!.token, user.id)}
                className="h-8 min-w-0 px-2"
                title="Copy Shadowrocket subscription link"
              >
                {copyRocketSuccess === user.id ? (
                  <><Check className="h-3 w-3 mr-1 text-accent-success" /><span className="text-accent-success text-xs">COPIED</span></>
                ) : (
                  <><Rocket className="h-3 w-3 mr-1" /><span className="text-xs">SR</span></>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => openSubscriptionDialog(user)}
                title="订阅设置"
                className="h-8 w-8"
              >
                <Settings2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 桌面端表格渲染
  const renderDesktopTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full font-mono text-sm">
        <thead>
          <tr className="border-b border-border bg-background-secondary">
            <th className="text-left p-3 text-foreground-secondary text-xs uppercase tracking-wider">#</th>
            <th className="text-left p-3 text-foreground-secondary text-xs uppercase tracking-wider">Email</th>
            <th className="text-left p-3 text-foreground-secondary text-xs uppercase tracking-wider">Role</th>
            <th className="text-left p-3 text-foreground-secondary text-xs uppercase tracking-wider">Status</th>
            <th className="text-left p-3 text-foreground-secondary text-xs uppercase tracking-wider">Expires</th>
            <th className="text-left p-3 text-foreground-secondary text-xs uppercase tracking-wider">Subscription</th>
            <th className="text-left p-3 text-foreground-secondary text-xs uppercase tracking-wider">Created</th>
            <th className="text-right p-3 text-foreground-secondary text-xs uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user, index) => {
            const status = getUserStatusLabel(user);
            return (
              <tr key={user.id} className="hover:bg-background-hover transition-colors">
                <td className="p-3 text-foreground-muted">{String(index + 1).padStart(2, '0')}</td>
                <td className="p-3"><span className="text-accent-info">{user.email}</span></td>
                <td className="p-3">
                  <span className={user.role === 'admin' ? 'text-accent-warning' : 'text-foreground-secondary'}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-3"><span className={status.className}>[{status.text}]</span></td>
                <td className="p-3 text-foreground-secondary">{user.expiresAt ? formatDate(user.expiresAt) : 'PERMANENT'}</td>
                <td className="p-3">
                  {user.subscription?.token ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-mono mr-1" title="访问次数/最大次数">
                        {user.subscription.accessCount}/{user.subscription.maxAccess === 0 ? '∞' : user.subscription.maxAccess}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => copySubscriptionLink(user.subscription!.token, user.id)} className="h-7 px-2">
                        {copySuccess === user.id ? (
                          <><Check className="h-3 w-3 mr-1 text-accent-success" /><span className="text-accent-success text-xs">COPIED</span></>
                        ) : (
                          <><Copy className="h-3 w-3 mr-1" /><span className="text-xs">LINK</span></>
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => copyShadowrocketLink(user.subscription!.token, user.id)} className="h-7 px-2" title="Copy Shadowrocket subscription link">
                        {copyRocketSuccess === user.id ? (
                          <><Check className="h-3 w-3 mr-1 text-accent-success" /><span className="text-accent-success text-xs">COPIED</span></>
                        ) : (
                          <><Rocket className="h-3 w-3 mr-1" /><span className="text-xs">ROCKET</span></>
                        )}
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => openSubscriptionDialog(user)} title="订阅设置">
                        <Settings2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-foreground-muted text-xs">--</span>
                  )}
                </td>
                <td className="p-3 text-foreground-muted text-xs">{formatDate(user.createdAt)}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => handleToggleActive(user)}>
                      <Power className={`h-4 w-4 ${user.isActive ? 'text-accent-success' : 'text-foreground-muted'}`} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(user)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(user.id)} className="hover:text-accent-error">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Terminal className="h-8 w-8 text-accent-primary animate-pulse" />
        <div className="text-foreground-secondary text-sm font-mono">
          Loading user database...
          <span className="terminal-cursor ml-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-3 sm:p-4 lg:space-y-6 lg:p-6">
      {/* 头部 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-wider uppercase flex items-center gap-2 sm:text-xl lg:text-2xl">
            <span className="text-foreground-muted">{'>'}</span>
            USER MANAGEMENT
          </h1>
          <p className="text-xs lg:text-sm text-foreground-secondary mt-1">
            <span className="hidden sm:inline">$ cat /etc/passwd | </span>Total: {users.length} users
            {searchTerm && (
              <span className="text-accent-info ml-2">
                (filtered by &quot;{searchTerm}&quot;)
              </span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Button
            onClick={() => fetchUsers(searchTerm || undefined)}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} sm:mr-2`}
            />
            <span>REFRESH</span>
          </Button>
          <Button onClick={openCreateDialog} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span>ADD USER</span>
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted" />
        <Input
          type="text"
          placeholder="Search email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 font-mono text-sm"
        />
        {searchTerm && (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {searching && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2">
            <RefreshCw className="h-4 w-4 animate-spin text-accent-primary" />
          </div>
        )}
      </div>

      {/* 用户表格 */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">+---</span>
            <Users className="h-4 w-4" />
            USER DATABASE
            <span className="text-foreground-muted">---+</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted font-mono text-sm">
              {searchTerm ? (
                <>
                  <p>No users found matching &quot;{searchTerm}&quot;</p>
                  <p className="text-xs mt-1">$ grep -i &quot;{searchTerm}&quot; /etc/passwd | wc -l → 0</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    className="mt-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    CLEAR SEARCH
                  </Button>
                </>
              ) : (
                <>
                  <p>No users found in database</p>
                  <p className="text-xs mt-1">$ useradd -m newuser</p>
                </>
              )}
            </div>
          ) : (
            <ResponsiveTable
              data={users}
              keyField="id"
              columns={[]}
              renderCard={renderUserCard}
              renderTable={renderDesktopTable}
            />
          )}
        </CardContent>
      </Card>

      {/* 用户表单对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'EDIT USER' : 'CREATE USER'}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editingUser ? handleUpdate : handleCreate}
            className="space-y-4"
          >
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

            {/* 邮箱 */}
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-foreground-secondary text-xs uppercase tracking-wider"
              >
                $ EMAIL
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="user@example.com"
                required
                autoComplete="off"
              />
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-foreground-secondary text-xs uppercase tracking-wider"
              >
                $ PASSWORD{' '}
                <span className="text-foreground-muted">
                  {editingUser
                    ? '(leave empty to keep)'
                    : formData.role === 'admin'
                      ? '(required for admin)'
                      : '(optional)'}
                </span>
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                required={!editingUser && formData.role === 'admin'}
                autoComplete="new-password"
              />
            </div>

            {/* 角色 */}
            <div className="space-y-2">
              <Label
                htmlFor="role"
                className="text-foreground-secondary text-xs uppercase tracking-wider"
              >
                $ ROLE
              </Label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
                className="flex h-10 w-full rounded-2xl border border-border bg-background-secondary px-4 py-2 text-sm text-foreground-primary font-mono transition-all duration-fast focus-visible:outline-none focus-visible:border-border-strong focus-visible:ring-4 focus-visible:ring-ring"
              >
                <option value="user">[USER] Regular User</option>
                <option value="admin">[ADMIN] Administrator</option>
              </select>
            </div>

            {/* 到期时间 */}
            <div className="space-y-2">
              <Label
                htmlFor="expiresAt"
                className="text-foreground-secondary text-xs uppercase tracking-wider"
              >
                $ EXPIRES AT{' '}
                <span className="text-foreground-muted">
                  (empty = permanent)
                </span>
              </Label>
              <DatePicker
                date={formData.expiresAt}
                onDateChange={(date) =>
                  setFormData({ ...formData, expiresAt: date })
                }
                placeholder="Select expiration date"
              />
            </div>

            {/* 配置选择 */}
            <div className="space-y-2">
              <Label className="text-foreground-secondary text-xs uppercase tracking-wider">
                $ ASSIGNED CONFIGS
              </Label>
              <div className="max-h-32 space-y-2 overflow-y-auto rounded-2xl border border-border bg-background-secondary p-3 backdrop-blur-xl">
                {configs.length === 0 ? (
                  <p className="text-sm text-foreground-muted font-mono">
                    No configs available
                  </p>
                ) : (
                  configs.map((config) => (
                    <div
                      key={config.id}
                      className="flex items-center space-x-2"
                    >
                      <button
                        type="button"
                        onClick={() => toggleConfigSelection(config.id)}
                        className="text-foreground-muted hover:text-foreground-primary transition-colors"
                      >
                        {formData.configIds.includes(config.id) ? (
                          <span className="text-accent-success">[x]</span>
                        ) : (
                          <span>[ ]</span>
                        )}
                      </button>
                      <Label
                        htmlFor={`config-${config.id}`}
                        className="cursor-pointer font-mono text-sm"
                        onClick={() => toggleConfigSelection(config.id)}
                      >
                        {config.name}
                        {!config.isActive && (
                          <span className="text-foreground-muted ml-2">
                            (inactive)
                          </span>
                        )}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 封禁状态 */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, isBanned: !formData.isBanned })
                }
                className="text-foreground-muted hover:text-foreground-primary transition-colors"
              >
                {formData.isBanned ? (
                  <span className="text-accent-error">[x]</span>
                ) : (
                  <span>[ ]</span>
                )}
              </button>
              <Label
                className="cursor-pointer font-mono text-sm"
                onClick={() =>
                  setFormData({ ...formData, isBanned: !formData.isBanned })
                }
              >
                BAN USER{' '}
                <span className="text-foreground-muted">
                  (block all access)
                </span>
              </Label>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                [ CANCEL ]
              </Button>
              <Button type="submit">
                {editingUser ? '[ UPDATE ]' : '[ CREATE ]'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 订阅设置对话框 */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>SUBSCRIPTION SETTINGS</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {subscriptionUser && (
              <>
                {/* 用户信息 */}
                <div className="rounded-2xl border border-border bg-background-secondary p-3 font-mono text-sm backdrop-blur-xl">
                  <div className="text-foreground-muted text-xs uppercase mb-1">USER</div>
                  <div className="text-accent-info">{subscriptionUser.email}</div>
                </div>

                {/* 当前访问统计 */}
                <div className="rounded-2xl border border-border bg-background-secondary p-3 font-mono text-sm backdrop-blur-xl">
                  <div className="text-foreground-muted text-xs uppercase mb-1">CURRENT ACCESS</div>
                  <div className="text-foreground-primary">
                    {subscriptionUser.subscription?.accessCount ?? 0} / {subscriptionUser.subscription?.maxAccess === 0 ? '∞' : (subscriptionUser.subscription?.maxAccess ?? 20)}
                  </div>
                </div>

                {/* 最大访问次数设置 */}
                <div className="space-y-2">
                  <Label
                    htmlFor="maxAccess"
                    className="text-foreground-secondary text-xs uppercase tracking-wider"
                  >
                    $ MAX ACCESS{' '}
                    <span className="text-foreground-muted">(0 = unlimited)</span>
                  </Label>
                  <Input
                    id="maxAccess"
                    type="number"
                    min="0"
                    value={subscriptionMaxAccess}
                    onChange={(e) => setSubscriptionMaxAccess(parseInt(e.target.value) || 0)}
                    className="font-mono"
                  />
                </div>

                {/* 重置按钮 */}
                <div className="rounded-2xl border border-accent-warning/30 bg-accent-warning/5 p-3">
                  <div className="flex items-center gap-2 text-accent-warning text-sm font-mono mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>DANGER ZONE</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetSubscription}
                    disabled={resetting}
                    className="w-full border-accent-warning/50 text-accent-warning hover:bg-accent-warning/10"
                  >
                    {resetting ? (
                      <><RefreshCcw className="h-3 w-3 mr-2 animate-spin" />RESETTING...</>
                    ) : (
                      <><RefreshCcw className="h-3 w-3 mr-2" />RESET SUBSCRIPTION LINK</>
                    )}
                  </Button>
                  <p className="text-xs text-foreground-muted mt-2 font-mono">
                    This will generate a new link. The old link will be invalidated immediately.
                  </p>
                </div>

                {/* 按钮 */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSubscriptionDialogOpen(false)}
                  >
                    [ CANCEL ]
                  </Button>
                  <Button onClick={handleUpdateSubscription}>
                    [ SAVE ]
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 底部状态栏 */}
      <div className="border border-border p-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2 text-foreground-muted">
          <span className="text-accent-success">●</span>
          <span className="hidden sm:inline">DATABASE STATUS: CONNECTED</span>
          <span className="sm:hidden">CONNECTED</span>
          <span className="hidden sm:inline mx-2">|</span>
          <span>TOTAL: {users.length}</span>
          <span className="mx-2">|</span>
          <span>
            ACTIVE: {users.filter((u) => u.isActive && !u.isBanned).length}
          </span>
          <span className="mx-2">|</span>
          <span>BANNED: {users.filter((u) => u.isBanned).length}</span>
        </div>
      </div>
    </div>
  );
}
