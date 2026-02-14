import { cn } from '@/lib/utils';
import type { GpsStatus } from '@/types';

interface StatusBadgeProps {
  status: GpsStatus;
  daysUntilExpiration?: number;
  className?: string;
}

const statusConfig = {
  active: {
    label: 'Active',
    dotColor: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  'expiring-soon': {
    label: 'Expiring Soon',
    dotColor: 'bg-yellow-500',
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  expired: {
    label: 'Expired',
    dotColor: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

export function StatusBadge({ status, daysUntilExpiration, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200',
        'hover:scale-105',
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full animate-pulse',
          config.dotColor,
          status === 'active' && 'animate-none'
        )}
      />
      <span>{config.label}</span>
      {daysUntilExpiration !== undefined && status !== 'expired' && (
        <span className="opacity-75">({daysUntilExpiration}d)</span>
      )}
    </div>
  );
}
