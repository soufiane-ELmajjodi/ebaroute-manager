import { useState, useEffect } from 'react';
import { Satellite, Plus, Settings, MapPin, History, Loader2, AlertCircle } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { DashboardStats } from '@/components/DashboardStats';
import { GpsDevicesTable } from '@/components/GpsDevicesTable';
import { GpsDeviceModal } from '@/components/GpsDeviceModal';
import { DeviceHistoryModal } from '@/components/DeviceHistoryModal';
import { RechargeHistory } from '@/components/RechargeHistory';
import { SettingsModal } from '@/components/SettingsModal';
import { Button } from '@/components/ui/button';
import { useGpsStore } from '@/store/gpsStore';
import { LoginPage } from '@/components/LoginPage';
import type { GpsDeviceWithStatus } from '@/types';


function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<GpsDeviceWithStatus | null>(null);
  const [viewingDeviceId, setViewingDeviceId] = useState<string | null>(null);

  const fetchData = useGpsStore((state) => state.fetchData);
  const isLoading = useGpsStore((state) => state.isLoading);
  const error = useGpsStore((state) => state.error);
  const isAuthenticated = useGpsStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(fetchData, 300000); // Auto-refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchData, isAuthenticated]);


  const handleEditDevice = (device: GpsDeviceWithStatus) => {
    setEditingDevice(device);
    setIsDeviceModalOpen(true);
  };

  const handleViewHistory = (deviceId: string) => {
    setViewingDeviceId(deviceId);
    setIsHistoryModalOpen(true);
  };

  const handleAddDevice = () => {
    setEditingDevice(null);
    setIsDeviceModalOpen(true);
  };

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (isLoading && activeTab === 'dashboard' && useGpsStore.getState().devices.length === 0) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-slate-900 mx-auto" />
          <p className="text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} onAddDevice={handleAddDevice} />

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="text-center space-y-4 mb-10">
              <h1 className="text-4xl font-bold text-slate-900 tracking-tight">GPS Recharge Dashboard</h1>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                Monitor your GPS fleet recharge status and manage all your devices in one place.
              </p>
            </div>

            <DashboardStats />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-auto py-6 flex flex-col items-center gap-3" onClick={() => setActiveTab('devices')}>
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center"><MapPin className="h-6 w-6 text-slate-600" /></div>
                <div className="text-center"><p className="font-medium text-slate-900">View All Devices</p><p className="text-sm text-slate-500">Manage your GPS fleet</p></div>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex flex-col items-center gap-3" onClick={handleAddDevice}>
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center"><Plus className="h-6 w-6 text-slate-600" /></div>
                <div className="text-center"><p className="font-medium text-slate-900">Add New Device</p><p className="text-sm text-slate-500">Register a new GPS</p></div>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex flex-col items-center gap-3" onClick={() => setActiveTab('history')}>
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center"><History className="h-6 w-6 text-slate-600" /></div>
                <div className="text-center"><p className="font-medium text-slate-900">View History</p><p className="text-sm text-slate-500">Recharge records</p></div>
              </Button>
              <Button variant="outline" className="h-auto py-6 flex flex-col items-center gap-3" onClick={() => setIsSettingsModalOpen(true)}>
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center"><Settings className="h-6 w-6 text-slate-600" /></div>
                <div className="text-center"><p className="font-medium text-slate-900">Settings</p><p className="text-sm text-slate-500">Configure alerts</p></div>
              </Button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('history')}>View All</Button>
              </div>
              <RechargeHistory />
            </div>
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">GPS Devices</h1>
                <p className="text-slate-500">Manage and recharge your GPS fleet</p>
              </div>
              <Button onClick={handleAddDevice} className="gap-2"><Plus className="h-4 w-4" />Add Device</Button>
            </div>
            <GpsDevicesTable onEdit={handleEditDevice} onViewHistory={handleViewHistory} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Recharge History</h1>
              <p className="text-slate-500">View all recharge transactions</p>
            </div>
            <RechargeHistory />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center"><Satellite className="h-4 w-4 text-white" /></div>
              <span className="font-semibold text-slate-900">GPS Recharge Manager</span>
            </div>
            <p className="text-sm text-slate-500">Built for efficient fleet management</p>
          </div>
        </div>
      </footer>

      <GpsDeviceModal isOpen={isDeviceModalOpen} onClose={() => { setIsDeviceModalOpen(false); setEditingDevice(null); }} device={editingDevice} />
      <DeviceHistoryModal isOpen={isHistoryModalOpen} onClose={() => { setIsHistoryModalOpen(false); setViewingDeviceId(null); }} deviceId={viewingDeviceId} />
      <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
    </div>
  );
}

export default App;
