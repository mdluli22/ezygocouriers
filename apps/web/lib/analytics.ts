export const PRESENCE_INTERVAL_MS = 60_000;
export const ANALYTICS_REFRESH_MS = 30_000;

export interface UserAnalytics {
  registered: number;
  customers: number;
  drivers: number;
  admins: number;
  enabled: number;
  verified: number;
  unverified: number;
  today: number;
  last7Days: number;
  last30Days: number;
  live: number;
  trend: { date: string; count: number }[];
  updatedAt: string;
}
