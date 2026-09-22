import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('card card-interactive p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-clinical-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-clinical-900">{value}</p>
          {subtitle && (
            <p
              className={cn(
                'text-xs mt-1',
                trend === 'up' && 'text-emerald-600',
                trend === 'down' && 'text-red-600',
                !trend && 'text-clinical-500'
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="w-10 h-10 bg-medical-50 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-medical-600" />
        </div>
      </div>
    </div>
  );
}
