import { useState, useEffect } from 'react';
import { Satellite, Plus, Menu, X, History, MapPin, LayoutDashboard, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useGpsStore } from '@/store/gpsStore';
import { cn } from '@/lib/utils';


interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onAddDevice: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'devices', label: 'GPS Devices', icon: MapPin },
  { id: 'history', label: 'History', icon: History },
];

export function Navigation({ activeTab, onTabChange, onAddDevice }: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            'flex items-center justify-between transition-all duration-300',
            isScrolled ? 'h-16' : 'h-20'
          )}
        >
          {/* Logo */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onTabChange('dashboard')}
          >
            <div
              className={cn(
                'rounded-xl bg-slate-900 flex items-center justify-center transition-all duration-300',
                'group-hover:scale-105 group-hover:rotate-3',
                isScrolled ? 'h-9 w-9' : 'h-10 w-10'
              )}
            >
              <Satellite className="h-5 w-5 text-white" />
            </div>
            <span
              className={cn(
                'font-bold text-slate-900 transition-all duration-300',
                isScrolled ? 'text-lg' : 'text-xl'
              )}
            >
              GPS Recharge
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  'relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                  'hover:bg-slate-100',
                  activeTab === item.id
                    ? 'text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {item.label}
                {activeTab === item.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-slate-900" />
                )}
              </button>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              onClick={onAddDevice}
              size="sm"
              className="gap-2 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Add GPS Device
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => useGpsStore.getState().logout()}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200 hover:border-red-100"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>


          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-slate-600" />
            ) : (
              <Menu className="h-6 w-6 text-slate-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg transition-all duration-300',
          isMobileMenuOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-4 pointer-events-none'
        )}
      >
        <nav className="px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                activeTab === item.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-100 mt-2">
            <Button
              onClick={() => {
                onAddDevice();
                setIsMobileMenuOpen(false);
              }}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add GPS Device
            </Button>
            <Button
              onClick={() => useGpsStore.getState().logout()}
              variant="outline"
              className="w-full gap-2 text-red-600 hover:bg-red-50 mt-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>

        </nav>
      </div>
    </header>
  );
}
