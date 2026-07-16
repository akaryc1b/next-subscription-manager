'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AccessLogView, MonitorFilters, MonitorStats, SecurityEventView } from '@/types/monitor';

interface MonitorResponse<T> {
  stats?: MonitorStats;
  logs?: AccessLogView[];
  events?: SecurityEventView[];
  error?: string;
}

const defaultStats: MonitorStats = {
  users: 0,
  configs: 0,
  subscriptions: 0,
  accesses: 0,
  securityEvents: 0,
  todayAccesses: 0,
  last24hAccesses: 0,
  criticalSecurityEvents: 0,
  warningSecurityEvents: 0,
  uniqueIps: 0,
};

async function readJson<T>(response: Response): Promise<MonitorResponse<T>> {
  const data = (await response.json()) as MonitorResponse<T>;
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }
  return data;
}

function appendDateRange(params: URLSearchParams, filters: MonitorFilters) {
  if (filters.from) params.set('from', new Date(filters.from).toISOString());
  if (filters.to) params.set('to', new Date(filters.to).toISOString());
}

export function useMonitorData(filters: MonitorFilters, autoRefresh: boolean, refreshInterval: number) {
  const [stats, setStats] = useState<MonitorStats>(defaultStats);
  const [logs, setLogs] = useState<AccessLogView[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEventView[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const queryKey = useMemo(() => JSON.stringify(filters), [filters]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const statsParams = new URLSearchParams();
      appendDateRange(statsParams, filters);

      const logsParams = new URLSearchParams({ limit: String(filters.limit) });
      appendDateRange(logsParams, filters);
      if (filters.accessEmail) logsParams.set('email', filters.accessEmail);
      if (filters.accessIp) logsParams.set('ip', filters.accessIp);
      if (filters.accessQuery) logsParams.set('q', filters.accessQuery);

      const securityParams = new URLSearchParams({ limit: String(filters.limit) });
      appendDateRange(securityParams, filters);
      if (filters.securitySeverity) securityParams.set('severity', filters.securitySeverity);
      if (filters.securityType) securityParams.set('type', filters.securityType);
      if (filters.securityIp) securityParams.set('ip', filters.securityIp);

      const [statsData, logsData, securityData] = await Promise.all([
        fetch(`/api/stats?${statsParams.toString()}`).then(readJson<MonitorStats>),
        fetch(`/api/logs?${logsParams.toString()}`).then(readJson<AccessLogView>),
        fetch(`/api/security-events?${securityParams.toString()}`).then(readJson<SecurityEventView>),
      ]);

      setStats(statsData.stats || defaultStats);
      setLogs(logsData.logs || []);
      setSecurityEvents(securityData.events || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh monitoring data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, queryKey]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = window.setInterval(() => void fetchData(), refreshInterval * 1000);
    return () => window.clearInterval(interval);
  }, [autoRefresh, fetchData, refreshInterval]);

  return { stats, logs, securityEvents, loading, refreshing, error, lastUpdated, refresh: fetchData };
}
