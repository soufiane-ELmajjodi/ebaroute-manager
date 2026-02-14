import { create } from 'zustand';
import { addDays, format, parseISO, differenceInDays, isBefore, isSameDay, startOfDay } from 'date-fns';
import type { GpsDevice, GpsDeviceWithStatus, RechargeHistory, DashboardStats, AppSettings } from '@/types';

const API_URL = 'http://localhost:3007/api';

interface GpsStoreState {
  devices: GpsDevice[];
  history: RechargeHistory[];
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  fetchData: () => Promise<void>;
  addDevice: (device: Omit<GpsDevice, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDevice: (id: string, updates: Partial<GpsDevice>) => Promise<void>;
  deleteDevice: (id: string) => Promise<void>;
  performRecharge: (deviceId: string) => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
}



const defaultSettings: AppSettings = {
  alertDaysBefore: 3,
  rechargeAmount: 5,
  currency: 'MAD',
};

const generateId = () => Math.random().toString(36).substring(2, 15);

// Sample data - removed for production Google Sheets integration


export const useGpsStore = create<GpsStoreState>((set, get) => ({
  devices: [],
  history: [],
  settings: defaultSettings,
  isLoading: false,
  error: null,
  token: localStorage.getItem('gps_auth_token'),
  isAuthenticated: !!localStorage.getItem('gps_auth_token'),

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (data.success && data.token) {
        localStorage.setItem('gps_auth_token', data.token);
        set({ token: data.token, isAuthenticated: true, isLoading: false });
        return true;
      } else {
        set({ error: data.error || 'Invalid credentials', isLoading: false });
        return false;
      }
    } catch (err) {
      set({ error: 'Failed to connect to server', isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('gps_auth_token');
    set({ token: null, isAuthenticated: false, devices: [], history: [] });
  },

  fetchData: async () => {
    if (!API_URL) return;
    const token = get().token;
    if (!token) return;

    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${API_URL}/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401 || response.status === 403) {
        get().logout();
        return;
      }

      const data = await response.json();
      set({
        devices: data.devices || [],
        history: data.history || [],
        settings: { ...defaultSettings, ...data.settings },
        isLoading: false
      });
    } catch (err) {
      set({ error: 'Failed to fetch data from server', isLoading: false });
    }
  },


  addDevice: async (deviceData) => {
    const now = new Date().toISOString();
    const newDevice: GpsDevice = {
      ...deviceData,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    if (API_URL) {
      set({ isLoading: true });
      try {
        await fetch(`${API_URL}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${get().token}`
          },
          body: JSON.stringify({ action: 'ADD_DEVICE', device: newDevice }),
        });

      } catch (err) {
        set({ error: 'Failed to add device' });
      }
    }

    set((state) => ({
      devices: [...state.devices, newDevice],
      isLoading: false
    }));
  },

  updateDevice: async (id, updates) => {
    if (API_URL) {
      set({ isLoading: true });
      try {
        await fetch(`${API_URL}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${get().token}`
          },
          body: JSON.stringify({ action: 'UPDATE_DEVICE', id, updates }),
        });

      } catch (err) {
        set({ error: 'Failed to update device' });
      }
    }

    set((state) => ({
      devices: state.devices.map((device) =>
        device.id === id ? { ...device, ...updates, updatedAt: new Date().toISOString() } : device
      ),
      isLoading: false
    }));
  },

  deleteDevice: async (id) => {
    if (API_URL) {
      set({ isLoading: true });
      try {
        await fetch(`${API_URL}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${get().token}`
          },
          body: JSON.stringify({ action: 'DELETE_DEVICE', id }),
        });

      } catch (err) {
        set({ error: 'Failed to delete device' });
      }
    }

    set((state) => ({
      devices: state.devices.filter((device) => device.id !== id),
      history: state.history.filter((h) => h.gpsDeviceId !== id),
      isLoading: false
    }));
  },

  performRecharge: async (deviceId) => {
    const device = get().devices.find((d) => d.id === deviceId);
    if (!device) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const historyEntry: RechargeHistory = {
      id: generateId(),
      gpsDeviceId: device.id,
      gpsNumber: device.gpsNumber,
      clientName: device.clientName,
      rechargeDate: today,
      amount: get().settings.rechargeAmount,
      createdAt: new Date().toISOString(),
    };

    if (API_URL) {
      const token = get().token;
      set({ isLoading: true });
      try {
        await fetch(`${API_URL}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'UPDATE_DEVICE', id: deviceId, updates: { lastRechargeDate: today } }),
        });
        await fetch(`${API_URL}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'ADD_HISTORY', history: historyEntry }),
        });
      } catch (err) {

        set({ error: 'Failed to perform recharge' });
      }
    }

    set((state) => ({
      devices: state.devices.map((d) =>
        d.id === deviceId ? { ...d, lastRechargeDate: today, updatedAt: new Date().toISOString() } : d
      ),
      history: [historyEntry, ...state.history],
      isLoading: false
    }));
  },

  updateSettings: async (updates) => {
    const newSettings = { ...get().settings, ...updates };
    if (API_URL) {
      set({ isLoading: true });
      try {
        await fetch(`${API_URL}/action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${get().token}`
          },
          body: JSON.stringify({ action: 'UPDATE_SETTINGS', updates: newSettings }),
        });
      } catch (err) {
        set({ error: 'Failed to update settings' });
      }
    }

    set({ settings: newSettings, isLoading: false });
  },
}));


// Helper functions
export const calculateDeviceStatus = (device: GpsDevice, alertDaysBefore: number): GpsDeviceWithStatus => {
  const lastRechargeDate = device.lastRechargeDate || format(new Date(), 'yyyy-MM-dd');
  const lastRecharge = parseISO(lastRechargeDate);
  const expirationDate = addDays(lastRecharge, 30);
  const alertDate = addDays(expirationDate, -alertDaysBefore);
  const today = startOfDay(new Date());

  let status: 'active' | 'expiring-soon' | 'expired' = 'active';
  if (isBefore(expirationDate, today) || isSameDay(expirationDate, today)) {
    status = 'expired';
  } else if (isBefore(alertDate, today) || isSameDay(alertDate, today)) {
    status = 'expiring-soon';
  }

  return {
    ...device,
    expirationDate: format(expirationDate, 'yyyy-MM-dd'),
    nextRechargeDate: format(expirationDate, 'yyyy-MM-dd'),
    alertDate: format(alertDate, 'yyyy-MM-dd'),
    status,
    daysUntilExpiration: Math.max(0, differenceInDays(expirationDate, today)),
  };
};

export const calculateStats = (devices: GpsDevice[], settings: AppSettings): DashboardStats => {
  const devicesWithStatus = devices.map((d) => calculateDeviceStatus(d, settings.alertDaysBefore));
  return {
    totalDevices: devices.length,
    needsRechargeNow: devicesWithStatus.filter((d) => d.status === 'expired').length,
    expiringSoon: devicesWithStatus.filter((d) => d.status === 'expiring-soon').length,
    monthlyCost: devices.length * settings.rechargeAmount,
  };
};
