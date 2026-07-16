export interface MonitorStats {
  users: number;
  configs: number;
  subscriptions: number;
  accesses: number;
  securityEvents: number;
  todayAccesses: number;
  last24hAccesses: number;
  criticalSecurityEvents: number;
  warningSecurityEvents: number;
  uniqueIps: number;
}

export interface AccessLogView {
  id: string;
  ipAddress: string;
  userAgent: string | null;
  accessedAt: string;
  userId: string;
  email: string;
  activeConfigNames: string[];
}

export interface SecurityEventView {
  id: string;
  type: string;
  severity: string;
  method: string;
  path: string;
  statusCode: number | null;
  ipAddress: string;
  userAgent: string | null;
  userId: string | null;
  identifier: string | null;
  message: string | null;
  createdAt: string;
}

export interface MonitorFilters {
  accessQuery: string;
  accessEmail: string;
  accessIp: string;
  securityType: string;
  securitySeverity: string;
  securityIp: string;
  from: string;
  to: string;
  limit: number;
}
