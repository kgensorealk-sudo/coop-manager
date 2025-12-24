
import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  colorClass = "bg-blue-50 text-blue-600"
}) => {
  return (
    <div className="bg-white rounded-sm border border-slate-200 p-6 shadow-paper hover:shadow-paper-hover transition-all duration-300 relative overflow-hidden group">
      {/* Decorative corner mark */}
      <div className="absolute top-0 right-0 w-8 h-8 bg-slate-50 rotate-45 transform translate-x-4 -translate-y-4 border border-slate-100"></div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`p-3 rounded-lg border border-slate-100 ${colorClass}`}>
          <Icon size={24} strokeWidth={1.5} />
        </div>
        {trend && (
          <div className={`text-xs font-serif font-bold italic px-2 py-1 border rounded-sm ${trendUp ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest font-sans">{title}</h3>
      <p className="text-3xl font-serif font-bold text-slate-800 mt-2 tracking-tight">{value}</p>
    </div>
  );
};
