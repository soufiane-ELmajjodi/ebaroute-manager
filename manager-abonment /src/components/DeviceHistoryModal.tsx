import { useMemo } from 'react';
import { History, Calendar, Wallet, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useGpsStore } from '@/store/gpsStore';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeviceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string | null;
}

export function DeviceHistoryModal({ isOpen, onClose, deviceId }: DeviceHistoryModalProps) {
  const devices = useGpsStore((state) => state.devices);
  const history = useGpsStore((state) => state.history);
  const settings = useGpsStore((state) => state.settings);

  const device = useMemo(() => devices.find((d) => d.id === deviceId), [devices, deviceId]);

  const deviceHistory = useMemo(() => {
    if (!deviceId) return [];
    return history
      .filter((h) => h.gpsDeviceId === deviceId)
      .sort((a, b) => new Date(b.rechargeDate).getTime() - new Date(a.rechargeDate).getTime());
  }, [history, deviceId]);

  if (!device) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden max-h-[80vh]">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <History className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <div>Recharge History</div>
              <div className="text-sm font-normal text-slate-500">
                {device.gpsNumber} {device.clientName && `• ${device.clientName}`}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 overflow-y-auto max-h-[50vh]">
          {deviceHistory.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No recharge history found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {deviceHistory.map((entry) => (
                <div key={entry.id} className="flex gap-4 p-4 rounded-xl border bg-white border-slate-200">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">Recharge Completed</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(parseISO(entry.rechargeDate), 'MMMM d, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                    <Wallet className="h-3.5 w-3.5" />
                    {entry.amount} {settings.currency}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          <Button onClick={onClose} variant="outline" className="w-full">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
