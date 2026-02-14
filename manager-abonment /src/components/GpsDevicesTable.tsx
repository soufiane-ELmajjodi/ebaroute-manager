import { useState, useMemo } from 'react';
import { Search, RefreshCw, MoreHorizontal, Edit2, Trash2, History, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useGpsStore, calculateDeviceStatus } from '@/store/gpsStore';
import { StatusBadge } from './StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { GpsDeviceWithStatus, GpsStatus } from '@/types';

type SortField = 'gpsNumber' | 'clientName' | 'lastRechargeDate' | 'expirationDate' | 'status';
type SortDirection = 'asc' | 'desc';

interface GpsDevicesTableProps {
  onEdit: (device: GpsDeviceWithStatus) => void;
  onViewHistory: (deviceId: string) => void;
}

export function GpsDevicesTable({ onEdit, onViewHistory }: GpsDevicesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GpsStatus | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('expirationDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deviceToDelete, setDeviceToDelete] = useState<GpsDeviceWithStatus | null>(null);
  const [rechargingId, setRechargingId] = useState<string | null>(null);

  const devices = useGpsStore((state) => state.devices);
  const settings = useGpsStore((state) => state.settings);
  const performRecharge = useGpsStore((state) => state.performRecharge);
  const deleteDevice = useGpsStore((state) => state.deleteDevice);

  const devicesWithStatus = useMemo(() =>
    devices.map((d) => calculateDeviceStatus(d, settings.alertDaysBefore)),
    [devices, settings.alertDaysBefore]
  );

  const filteredDevices = useMemo(() => {
    let result = [...devicesWithStatus];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.gpsNumber.toLowerCase().includes(query) ||
          d.simNumber.toLowerCase().includes(query) ||
          d.clientName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((d) => d.status === statusFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'gpsNumber': comparison = a.gpsNumber.localeCompare(b.gpsNumber); break;
        case 'clientName': comparison = (a.clientName || '').localeCompare(b.clientName || ''); break;
        case 'lastRechargeDate': comparison = new Date(a.lastRechargeDate).getTime() - new Date(b.lastRechargeDate).getTime(); break;
        case 'expirationDate': comparison = new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime(); break;
        case 'status':
          const statusOrder: Record<string, number> = { expired: 0, 'expiring-soon': 1, active: 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [devicesWithStatus, searchQuery, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRecharge = async (deviceId: string) => {
    setRechargingId(deviceId);
    await new Promise((resolve) => setTimeout(resolve, 600));
    performRecharge(deviceId);
    setRechargingId(null);
  };

  const handleDelete = () => {
    if (deviceToDelete) {
      deleteDevice(deviceToDelete.id);
      setDeviceToDelete(null);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronDown className="h-3 w-3 opacity-30" />;
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search GPS devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {statusFilter === 'all' ? 'All Status' : statusFilter.replace('-', ' ')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>All Status</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('active')}>Active</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('expiring-soon')}>Expiring Soon</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('expired')}>Expired</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">Status<SortIcon field="status" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer" onClick={() => handleSort('gpsNumber')}>
                  <div className="flex items-center gap-1">GPS Number<SortIcon field="gpsNumber" /></div>
                </th>

                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">SIM Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer" onClick={() => handleSort('clientName')}>
                  <div className="flex items-center gap-1">Client<SortIcon field="clientName" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer" onClick={() => handleSort('lastRechargeDate')}>
                  <div className="flex items-center gap-1">Last Recharge<SortIcon field="lastRechargeDate" /></div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer" onClick={() => handleSort('expirationDate')}>
                  <div className="flex items-center gap-1">Expires<SortIcon field="expirationDate" /></div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="h-8 w-8 text-slate-300" />
                      <p>No GPS devices found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-4"><StatusBadge status={device.status} daysUntilExpiration={device.daysUntilExpiration} /></td>
                    <td className="px-4 py-4 font-medium text-slate-900">{device.gpsNumber}</td>

                    <td className="px-4 py-4 text-sm text-slate-600 font-mono">{device.simNumber}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{device.clientName || <span className="italic text-slate-400">No client</span>}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{format(parseISO(device.lastRechargeDate), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-4 text-sm">
                      {device.status === 'expired' ? (
                        <span className="text-red-600 font-medium">Expired</span>
                      ) : (
                        <span className={device.daysUntilExpiration <= 3 ? 'text-yellow-600 font-medium' : 'text-slate-600'}>
                          {format(parseISO(device.expirationDate), 'MMM d, yyyy')}
                          <span className="text-slate-400 ml-1">({device.daysUntilExpiration} days)</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" onClick={() => handleRecharge(device.id)} disabled={rechargingId === device.id}>
                          <RefreshCw className={`h-4 w-4 mr-2 ${rechargingId === device.id ? 'animate-spin' : ''}`} />
                          {rechargingId === device.id ? 'Recharging...' : 'Recharge'}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(device)}><Edit2 className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onViewHistory(device.id)}><History className="h-4 w-4 mr-2" />View History</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeviceToDelete(device)} className="text-red-600"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog open={!!deviceToDelete} onOpenChange={() => setDeviceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete GPS Device</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>{deviceToDelete?.gpsNumber}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
