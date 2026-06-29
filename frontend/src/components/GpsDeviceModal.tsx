import { useState, useEffect } from 'react';
import { Satellite, Calendar } from 'lucide-react';
import { format } from 'date-fns';
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
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { GpsDevice } from '@/types';

interface GpsDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device?: GpsDevice | null;
}

interface FormData {
  gpsNumber: string;
  simNumber: string;
  clientName: string;
  lastRechargeDate: Date;
}

interface FormErrors {
  gpsNumber?: string;
  simNumber?: string;
}

export function GpsDeviceModal({ isOpen, onClose, device }: GpsDeviceModalProps) {
  const isEditing = !!device;
  const addDevice = useGpsStore((state) => state.addDevice);
  const updateDevice = useGpsStore((state) => state.updateDevice);
  const existingDevices = useGpsStore((state) => state.devices);

  const [formData, setFormData] = useState<FormData>({
    gpsNumber: '',
    simNumber: '',
    clientName: '',
    lastRechargeDate: new Date(),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or device changes
  useEffect(() => {
    if (isOpen) {
      if (device) {
        setFormData({
          gpsNumber: device.gpsNumber,
          simNumber: device.simNumber,
          clientName: device.clientName || '',
          lastRechargeDate: new Date(device.lastRechargeDate),
        });
      } else {
        setFormData({
          gpsNumber: '',
          simNumber: '',
          clientName: '',
          lastRechargeDate: new Date(),
        });
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, device]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.gpsNumber.trim()) {
      newErrors.gpsNumber = 'GPS Number is required';
    } else if (!isEditing) {
      // Check for duplicate GPS number when adding
      const exists = existingDevices.some(
        (d) => d.gpsNumber.toLowerCase() === formData.gpsNumber.toLowerCase()
      );
      if (exists) {
        newErrors.gpsNumber = 'GPS Number already exists';
      }
    }



    if (!formData.simNumber.trim()) {
      newErrors.simNumber = 'SIM Number is required';
    } else if (!isEditing) {
      const exists = existingDevices.some(
        (d) => d.simNumber === formData.simNumber.trim()
      );
      if (exists) {
        newErrors.simNumber = 'SIM Number already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    const deviceData = {
      gpsNumber: formData.gpsNumber.trim(),
      simNumber: formData.simNumber.trim(),
      clientName: formData.clientName.trim() || undefined,
      lastRechargeDate: format(formData.lastRechargeDate, 'yyyy-MM-dd'),
    };

    if (isEditing && device) {
      await updateDevice(device.id, deviceData);
    } else {
      await addDevice(deviceData);
    }

    onClose();

  };

  const handleChange = (field: keyof FormData, value: string | Date) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center">
              <Satellite className="h-5 w-5 text-white" />
            </div>
            {isEditing ? 'Edit GPS Device' : 'Add GPS Device'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {/* GPS Number */}
          <div className="space-y-2">
            <Label htmlFor="gpsNumber" className="text-sm font-medium">
              IMEI <span className="text-red-500">*</span>
            </Label>
            <Input
              id="gpsNumber"
              placeholder="e.g., GPS-001"
              value={formData.gpsNumber}
              onChange={(e) => handleChange('gpsNumber', e.target.value)}
              className={cn(
                'transition-all duration-200',
                errors.gpsNumber && 'border-red-500 focus-visible:ring-red-200'
              )}
            />
            {errors.gpsNumber && (
              <p className="text-xs text-red-500">{errors.gpsNumber}</p>
            )}
          </div>



          {/* SIM Number */}
          <div className="space-y-2">
            <Label htmlFor="simNumber" className="text-sm font-medium">
              SIM Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="simNumber"
              placeholder="SIM card number"
              value={formData.simNumber}
              onChange={(e) => handleChange('simNumber', e.target.value.replace(/\D/g, ''))}
              className={cn(
                'font-mono transition-all duration-200',
                errors.simNumber && 'border-red-500 focus-visible:ring-red-200'
              )}
            />
            {errors.simNumber && (
              <p className="text-xs text-red-500">{errors.simNumber}</p>
            )}
          </div>

          {/* Client Name */}
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-sm font-medium">
              Client Name <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="clientName"
              placeholder="e.g., Ahmed Benali"
              value={formData.clientName}
              onChange={(e) => handleChange('clientName', e.target.value)}
              className="transition-all duration-200"
            />
          </div>

          {/* Last Recharge Date */}
          <div className="space-y-2">
            <Label htmlFor="lastRechargeDate" className="text-sm font-medium">
              Last Recharge Date <span className="text-red-500">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal transition-all duration-200',
                    !formData.lastRechargeDate && 'text-slate-400'
                  )}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {formData.lastRechargeDate ? (
                    format(formData.lastRechargeDate, 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={formData.lastRechargeDate}
                  onSelect={(date) => date && handleChange('lastRechargeDate', date)}
                  initialFocus
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'min-w-[100px] transition-all duration-200',
                isSubmitting && 'opacity-70'
              )}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                isEditing ? 'Save Changes' : 'Add Device'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
