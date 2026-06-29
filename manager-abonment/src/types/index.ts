export type GpsStatus = 'active' | 'expiring-soon' | 'expired';

export interface GpsDevice {
  id: string;
  gpsNumber: string;
  simNumber: string;
  clientName?: string;
  lastRechargeDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface GpsDeviceWithStatus extends GpsDevice {
  status: GpsStatus;
  expirationDate: string;
  nextRechargeDate: string;
  alertDate: string;
  daysUntilExpiration: number;
}

export interface RechargeHistory {
  id: string;
  gpsDeviceId: string;
  gpsNumber: string;
  clientName?: string;
  rechargeDate: string;
  amount: number;
  createdAt: string;
}

export interface DashboardStats {
  totalDevices: number;
  needsRechargeNow: number;
  expiringSoon: number;
  monthlyCost: number;
}

export interface AppSettings {
  alertDaysBefore: number;
  rechargeAmount: number;
  currency: string;
}
