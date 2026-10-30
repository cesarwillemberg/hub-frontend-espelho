export interface ActivityLogUser {
  id: string;
  name: string;
  email: string;
}

export interface ActivityLogSummary {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string | null;
  performedBy: ActivityLogUser | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityLogDetails extends ActivityLogSummary {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ActivityLogPage {
  content: ActivityLogSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ActivityLogFilters {
  search: string;
  action: string;
  entity: string;
  dateFrom: string;
  dateTo: string;
}
