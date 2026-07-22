'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, ChartNoAxesCombined } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AccessLogsPanel,
  MonitorFiltersPanel,
  MonitorHeader,
  SecurityEventsPanel,
  StatsGrid,
} from '@/components/monitor/monitor-panels'
import { useMonitorData } from '@/hooks/use-monitor-data'
import type { MonitorFilters } from '@/types/monitor'

const defaultFilters: MonitorFilters = {
  accessQuery: '',
  accessEmail: '',
  accessIp: '',
  securityType: '',
  securitySeverity: '',
  securityIp: '',
  from: '',
  to: '',
  limit: 50,
}

export default function MonitorPage() {
  const [filters, setFilters] = useState<MonitorFilters>(defaultFilters)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)

  const normalizedFilters = useMemo(
    () => ({
      ...filters,
      accessQuery: filters.accessQuery.trim(),
      accessEmail: filters.accessEmail.trim(),
      accessIp: filters.accessIp.trim(),
      securityType: filters.securityType.trim(),
      securityIp: filters.securityIp.trim(),
    }),
    [filters]
  )

  const {
    stats,
    logs,
    securityEvents,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  } = useMonitorData(normalizedFilters, autoRefresh, refreshInterval)

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary">
          <ChartNoAxesCombined className="h-5 w-5 animate-pulse" />
        </div>
        <div className="text-sm text-foreground-muted">Loading analytics workspace…</div>
      </div>
    )
  }

  return (
    <div className="saas-page">
      <MonitorHeader
        refreshing={refreshing}
        autoRefresh={autoRefresh}
        refreshInterval={refreshInterval}
        lastUpdated={lastUpdated}
        onRefresh={() => void refresh()}
        onAutoRefreshChange={setAutoRefresh}
        onRefreshIntervalChange={setRefreshInterval}
      />

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border border-accent-error/30 bg-accent-error/10 p-4 text-accent-error sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}

      <StatsGrid stats={stats} />
      <MonitorFiltersPanel filters={filters} onFiltersChange={setFilters} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SecurityEventsPanel events={securityEvents} />
        <AccessLogsPanel logs={logs} />
      </div>
    </div>
  )
}
