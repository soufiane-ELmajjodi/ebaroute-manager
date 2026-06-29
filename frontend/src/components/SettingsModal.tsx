import { useState } from 'react';
import { Settings, Bell, Wallet, AlertTriangle } from 'lucide-react';
import { useGpsStore } from '@/store/gpsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const settings = useGpsStore((state) => state.settings);
  const updateSettings = useGpsStore((state) => state.updateSettings);

  const [formData, setFormData] = useState({
    alertDaysBefore: settings.alertDaysBefore,
    rechargeAmount: settings.rechargeAmount,
    currency: settings.currency,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await updateSettings(formData);
    setIsSaving(false);
    onClose();
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Settings className="h-5 w-5 text-slate-600" />
            </div>
            Settings
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-500" />
              <Label className="text-sm font-medium">Alert Days Before Expiration</Label>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={10}
                value={formData.alertDaysBefore}
                onChange={(e) => setFormData({ ...formData, alertDaysBefore: parseInt(e.target.value) || 1 })}
                className="w-24"
              />
              <span className="text-sm text-slate-500">days</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-500" />
              <Label className="text-sm font-medium">Recharge Amount</Label>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                value={formData.rechargeAmount}
                onChange={(e) => setFormData({ ...formData, rechargeAmount: parseInt(e.target.value) || 1 })}
                className="w-24"
              />
              <Input
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                className="w-24 uppercase"
                maxLength={3}
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Note</p>
              <p className="opacity-80">Changes apply immediately to all devices.</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
