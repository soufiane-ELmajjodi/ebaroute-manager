import { useMemo } from 'react';
import { Satellite, AlertCircle, Clock, Wallet } from 'lucide-react';
import { useGpsStore, calculateStats } from '@/store/gpsStore';

const colorMap = {
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
};

export function DashboardStats() {
  const devices = useGpsStore((state) => state.devices);
  const settings = useGpsStore((state) => state.settings);
  const stats = useMemo(() => calculateStats(devices, settings), [devices, settings]);

  const statCards = [
    { title: 'Total GPS Devices', value: stats.totalDevices, icon: Satellite, color: 'blue' as const },
    { title: 'Needs Recharge Now', value: stats.needsRechargeNow, icon: AlertCircle, color: 'red' as const },
    { title: 'Expiring Soon', value: stats.expiringSoon, icon: Clock, color: 'yellow' as const },
    { title: 'Monthly Cost', value: `${stats.monthlyCost} ${settings.currency}`, icon: Wallet, color: 'green' as const },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <div key={card.title} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{card.title}</p>
              <h3 className={`mt-2 text-3xl font-bold ${colorMap[card.color].text}`}>{card.value}</h3>
            </div>
            <div className={`rounded-xl p-3 ${colorMap[card.color].bg}`}>
              <card.icon className={`h-6 w-6 ${colorMap[card.color].text}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
