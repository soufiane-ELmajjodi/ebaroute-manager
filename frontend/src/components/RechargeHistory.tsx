import { useState, useMemo } from 'react';
import { History, Calendar, Wallet, CheckCircle2, Filter, Download } from 'lucide-react';
import { format, parseISO, subDays, isAfter } from 'date-fns';
import { useGpsStore } from '@/store/gpsStore';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type TimeFilter = '7' | '30' | '90' | 'all';

export function RechargeHistory() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30');
  const history = useGpsStore((state) => state.history);
  const settings = useGpsStore((state) => state.settings);

  const filteredHistory = useMemo(() => {
    let result = [...history];
    if (timeFilter !== 'all') {
      const daysAgo = subDays(new Date(), parseInt(timeFilter));
      result = result.filter((h) => isAfter(parseISO(h.rechargeDate), daysAgo));
    }
    result.sort((a, b) => new Date(b.rechargeDate).getTime() - new Date(a.rechargeDate).getTime());
    return result;
  }, [history, timeFilter]);

  const totalAmount = filteredHistory.reduce((sum, h) => sum + h.amount, 0);

  const handleExport = () => {
    const csvContent = [
      ['Date', 'GPS Number', 'Client', 'Amount'].join(','),
      ...filteredHistory.map((h) => [format(parseISO(h.rechargeDate), 'yyyy-MM-dd'), h.gpsNumber, h.clientName || 'N/A', h.amount].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recharge-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filterLabels: Record<TimeFilter, string> = { '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days', 'all': 'All time' };

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recharge History</h2>
          <p className="text-sm text-slate-500">{filteredHistory.length} recharges • {totalAmount} {settings.currency} total</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2"><Filter className="h-4 w-4" />{filterLabels[timeFilter]}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTimeFilter('7')}>Last 7 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeFilter('30')}>Last 30 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeFilter('90')}>Last 90 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTimeFilter('all')}>All time</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport} disabled={filteredHistory.length === 0}>
            <Download className="h-4 w-4" />Export
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <History className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No history found</h3>
            <p className="text-sm text-slate-500 text-center max-w-sm">No recharge records found for the selected time period.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredHistory.map((entry) => (
              <div key={entry.id} className="flex items-center gap-4 p-4 hover:bg-slate-50">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{entry.gpsNumber}</p>
                    {entry.clientName && <p className="text-xs text-slate-500 truncate">{entry.clientName}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {format(parseISO(entry.rechargeDate), 'MMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    {format(parseISO(entry.createdAt), 'h:mm a')}
                  </div>
                  <div className="flex items-center justify-end">
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                      <Wallet className="h-3.5 w-3.5" />{entry.amount} {settings.currency}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
