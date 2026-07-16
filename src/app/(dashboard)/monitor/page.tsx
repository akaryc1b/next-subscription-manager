'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileText,
  Link as LinkIcon,
  Activity,
  RefreshCw,
  Terminal,
  Eye,
  Globe,
  Clock,
  ShieldAlert,
} from 'lucide-react';

/**
 * Terminal CLI Monitor Page
 *
 * 设计特点:
 * - 实时日志流风格
 * - ASCII 统计面板
 * - 命令行风格筛选器
 */

interface Stats {
  users: number;
  configs: number;
  subscriptions: number;
  accesses: number;
  securityEvents: number;
}

interface AccessLog {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  accessedAt: string;
  subscription: {
    user: {
      email: string;
      userConfigs: Array<{
        config: {
          name: string;
          isActive: boolean;
        };
      }>;
    };
  };
}

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | string;
  method: string;
  path: string;
  statusCode: number | null;
  ipAddress: string;
  userAgent: string | null;
  identifier: string | null;
  message: string | null;
  createdAt: string;
}

// ASCII 进度条生成器
function generateProgressBar(
  value: number,
  max: number,
  width: number = 15
): string {
  const percentage = Math.min(value / Math.max(max, 1), 1);
  const filled = Math.round(percentage * width);
  const empty = width - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
}

// 格式化时间为相对时间
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// 格式化完整时间
function formatFullTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function MonitorPage() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    configs: 0,
    subscriptions: 0,
    accesses: 0,
    securityEvents: 0,
  });
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AccessLog[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [uniqueUsers, setUniqueUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // 应用用户筛选
    if (selectedUser === 'all') {
      setFilteredLogs(logs);
    } else {
      setFilteredLogs(
        logs.filter((log) => log.subscription.user.email === selectedUser)
      );
    }
  }, [selectedUser, logs]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [statsRes, logsRes, securityRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/logs?limit=50'),
        fetch('/api/security-events?limit=50'),
      ]);
      const statsData = await statsRes.json();
      const logsData = await logsRes.json();
      const securityData = await securityRes.json();

      setStats({
        users: statsData.stats?.users || 0,
        configs: statsData.stats?.configs || 0,
        subscriptions: statsData.stats?.subscriptions || 0,
        accesses: statsData.stats?.accesses || 0,
        securityEvents: statsData.stats?.securityEvents || 0,
      });
      setLogs(logsData.logs || []);
      setSecurityEvents(securityData.events || []);

      // 提取唯一用户名
      const users = Array.from(
        new Set<string>(
          (logsData.logs || []).map(
            (log: AccessLog) => log.subscription.user.email
          )
        )
      ).sort();
      setUniqueUsers(users);
    } catch (err) {
      console.error('Failed to fetch data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Terminal className="h-8 w-8 text-accent-primary animate-pulse" />
        <div className="text-foreground-secondary text-sm font-mono">
          Connecting to monitoring service...
          <span className="terminal-cursor ml-1" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'TOTAL USERS',
      value: stats.users,
      max: 100,
      icon: Users,
      desc: 'registered accounts',
    },
    {
      title: 'TOTAL CONFIGS',
      value: stats.configs,
      max: 50,
      icon: FileText,
      desc: 'configuration files',
    },
    {
      title: 'TOTAL SUBS',
      value: stats.subscriptions,
      max: 100,
      icon: LinkIcon,
      desc: 'active subscriptions',
    },
    {
      title: 'TOTAL HITS',
      value: stats.accesses,
      max: 1000,
      icon: Activity,
      desc: 'all-time requests',
    },
    {
      title: 'SECURITY',
      value: stats.securityEvents,
      max: 100,
      icon: ShieldAlert,
      desc: 'tracked events',
    },
  ];

  const getSeverityClass = (severity: string) => {
    if (severity === 'critical') return 'text-accent-error';
    if (severity === 'error') return 'text-accent-error';
    if (severity === 'warning') return 'text-accent-warning';
    return 'text-accent-info';
  };

  return (
    <div className="space-y-4 lg:space-y-6 p-4 lg:p-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-wider uppercase flex items-center gap-2">
            <span className="text-foreground-muted">{'>'}</span>
            MONITORING CENTER
          </h1>
          <p className="text-xs lg:text-sm text-foreground-secondary mt-1">
            <span className="hidden sm:inline">$ tail -f /var/log/access.log | </span>Real-time monitoring
          </p>
        </div>
        <Button
          onClick={fetchData}
          variant="outline"
          size="sm"
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''} sm:mr-2`}
          />
          <span className="hidden sm:inline">REFRESH</span>
        </Button>
      </div>

      {/* 统计面板 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium tracking-wider text-foreground-secondary">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-foreground-muted" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold text-foreground-primary">
                  {stat.value.toLocaleString()}
                </div>
                <div className="mt-2 font-mono text-xs text-foreground-muted">
                  {generateProgressBar(stat.value, stat.max)}
                </div>
                <p className="text-xs text-foreground-secondary mt-1">
                  {stat.desc}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 安全事件 */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="flex items-center gap-2 text-sm">
            <span className="text-foreground-muted">+---</span>
            <ShieldAlert className="h-4 w-4" />
            SECURITY EVENTS
            <span className="text-foreground-muted">---+</span>
            <span className="text-xs text-foreground-muted ml-2">
              ({securityEvents.length} entries)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {securityEvents.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted font-mono text-sm">
              <p>No security events found</p>
              <p className="text-xs mt-1">$ tail -f /var/log/security.log</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="font-mono text-sm divide-y divide-border">
                {securityEvents.map((event, index) => (
                  <div
                    key={event.id}
                    className="px-4 py-3 hover:bg-background-hover transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-foreground-muted w-8 text-right shrink-0">
                        {String(index + 1).padStart(3, '0')}
                      </span>
                      <span className="text-foreground-muted">│</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-foreground-muted">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatFullTime(event.createdAt)}
                          </span>
                          <span className={getSeverityClass(event.severity)}>
                            {event.severity.toUpperCase()}
                          </span>
                          <span className="text-accent-info">
                            {event.type}
                          </span>
                          <span className="text-foreground-muted">
                            {event.method}
                          </span>
                          <span className="text-foreground-secondary break-all">
                            {event.path}
                          </span>
                          {event.statusCode && (
                            <span className="text-foreground-muted">
                              [{event.statusCode}]
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-2 mt-1 text-xs">
                          <Globe className="h-3 w-3 text-foreground-muted shrink-0 mt-0.5" />
                          <span className="text-accent-warning shrink-0">
                            {event.ipAddress}
                          </span>
                          {event.identifier && (
                            <>
                              <span className="text-foreground-muted shrink-0">|</span>
                              <span className="text-foreground-secondary">
                                {event.identifier}
                              </span>
                            </>
                          )}
                          {event.message && (
                            <>
                              <span className="text-foreground-muted shrink-0">|</span>
                              <span className="text-foreground-placeholder">
                                {event.message}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="text-foreground-muted text-xs shrink-0">
                        [{getRelativeTime(event.createdAt)}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 访问日志 */}
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className="text-foreground-muted">+---</span>
              <Eye className="h-4 w-4" />
              ACCESS LOGS
              <span className="text-foreground-muted">---+</span>
              <span className="text-xs text-foreground-muted ml-2">
                ({filteredLogs.length} entries)
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-muted font-mono hidden sm:inline">
                filter:
              </span>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border bg-background-primary text-foreground-primary font-mono transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary"
              >
                <option value="all">[ALL USERS]</option>
                {uniqueUsers.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-foreground-muted font-mono text-sm">
              <p>No access logs found</p>
              <p className="text-xs mt-1">
                {selectedUser === 'all'
                  ? '$ echo "Waiting for incoming requests..."'
                  : `$ grep "${selectedUser}" /var/log/access.log | wc -l => 0`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* 终端风格日志输出 */}
              <div className="font-mono text-sm divide-y divide-border">
                {filteredLogs.map((log, index) => {
                  const configNames =
                    log.subscription.user.userConfigs
                      .filter((uc) => uc.config.isActive)
                      .map((uc) => uc.config.name)
                      .join(', ') || 'none';

                  return (
                    <div
                      key={log.id}
                      className="px-4 py-3 hover:bg-background-hover transition-colors"
                    >
                      {/* 日志行 - 终端风格 */}
                      <div className="flex items-start gap-3">
                        {/* 行号 */}
                        <span className="text-foreground-muted w-8 text-right shrink-0">
                          {String(index + 1).padStart(3, '0')}
                        </span>

                        {/* 分隔符 */}
                        <span className="text-foreground-muted">│</span>

                        {/* 主要内容 */}
                        <div className="flex-1 min-w-0">
                          {/* 第一行：时间和用户 */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-foreground-muted">
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatFullTime(log.accessedAt)}
                            </span>
                            <span className="text-accent-success">
                              {log.subscription.user.email}
                            </span>
                            <span className="text-foreground-muted">
                              accessed
                            </span>
                            <span className="text-accent-info">
                              {configNames}
                            </span>
                          </div>

                          {/* 第二行：IP 和 User Agent */}
                          <div className="flex items-start gap-2 mt-1 text-xs">
                            <Globe className="h-3 w-3 text-foreground-muted shrink-0 mt-0.5" />
                            <span className="text-accent-warning shrink-0">
                              {log.ipAddress}
                            </span>
                            {log.userAgent && (
                              <>
                                <span className="text-foreground-muted shrink-0">|</span>
                                {/* 移动端截断，桌面端完整显示 */}
                                <span
                                  className="text-foreground-placeholder truncate sm:whitespace-normal sm:overflow-visible sm:text-clip sm:break-all"
                                  title={log.userAgent}
                                >
                                  {log.userAgent}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 相对时间 */}
                        <span className="text-foreground-muted text-xs shrink-0">
                          [{getRelativeTime(log.accessedAt)}]
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 底部状态栏 */}
      <div className="border border-border p-3 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-2 text-foreground-muted">
          <span className="text-accent-success animate-pulse">●</span>
          <span className="hidden sm:inline">MONITOR STATUS: ACTIVE</span>
          <span className="sm:hidden">ACTIVE</span>
          <span className="hidden sm:inline mx-2">|</span>
          <span>LOGS: {logs.length}</span>
          <span className="mx-2">|</span>
          <span>SECURITY: {securityEvents.length}</span>
          <span className="mx-2">|</span>
          <span>FILTERED: {filteredLogs.length}</span>
          <span className="mx-2">|</span>
          <span className="hidden sm:inline">UNIQUE USERS: {uniqueUsers.length}</span>
          <span className="sm:hidden">USERS: {uniqueUsers.length}</span>
        </div>
      </div>
    </div>
  );
}
