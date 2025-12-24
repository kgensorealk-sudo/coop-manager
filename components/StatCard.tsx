
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
  colorClass = "text-ink-800"
}) => {
  return (
    <div className="bg-paper-50 border-2 border-paper-200 p-6 relative overflow-hidden group hover:border-paper-300 transition-all duration-300">
      
      {/* Aesthetic: Corner decorative lines */}
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-paper-300"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-paper-300"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-paper-300"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-paper-300"></div>

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <h3 className="text-ink-500 text-xs font-bold uppercase tracking-[0.2em] font-sans mb-1">{title}</h3>
          <p className="text-3xl font-serif font-medium text-ink-900 tracking-tight">{value}</p>
        </div>
        
        <div className={`p-2.5 rounded-full border border-dashed border-paper-300 ${colorClass} bg-paper-100`}>
          <Icon size={20} strokeWidth={1.5} />
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center pt-3 border-t border-paper-200 border-dashed">
           <span className={`text-sm font-serif italic ${trendUp ? 'text-emerald-700' : 'text-wax-600'}`}>
             {trend}
           </span>
        </div>
      )}
    </div>
  );
};
