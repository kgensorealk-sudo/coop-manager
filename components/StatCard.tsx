
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
    <div className="bg-paper-50 border-2 border-paper-200 p-6 relative overflow-hidden group hover:border-ink-300 hover:-translate-y-1 hover:shadow-float transition-all duration-500 cursor-default">
      
      {/* Aesthetic: Corner decorative lines that expand on hover */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-paper-300 group-hover:w-6 group-hover:h-6 group-hover:border-ink-400 transition-all duration-500"></div>
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-paper-300 group-hover:w-6 group-hover:h-6 group-hover:border-ink-400 transition-all duration-500"></div>
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-paper-300 group-hover:w-6 group-hover:h-6 group-hover:border-ink-400 transition-all duration-500"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-paper-300 group-hover:w-6 group-hover:h-6 group-hover:border-ink-400 transition-all duration-500"></div>

      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'0.5\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="space-y-1">
          <h3 className="text-ink-500 text-sm font-black uppercase tracking-[0.25em] font-sans">
            {title}
          </h3>
          <p className="text-3xl font-serif font-bold text-ink-900 tracking-tight leading-none">
            {value}
          </p>
        </div>
        
        {/* Icon Container with "Seal" effect */}
        <div className={`relative p-3 rounded-sm border border-dashed border-paper-300 ${colorClass} bg-paper-100 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-sm`}>
          <Icon size={22} strokeWidth={1.5} className="relative z-10" />
          <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-sm"></div>
        </div>
      </div>
      
      {trend ? (
        <div className="flex items-center pt-4 border-t border-paper-200 border-dashed relative z-10">
           <span className={`text-base font-serif italic flex items-center gap-1.5 ${trendUp ? 'text-emerald-700' : 'text-wax-600'}`}>
             <span className={`w-2 h-2 rounded-full ${trendUp ? 'bg-emerald-500' : 'bg-wax-500'} animate-pulse`}></span>
             {trend}
           </span>
        </div>
      ) : (
        <div className="pt-4 border-t border-paper-200 border-dashed opacity-40 group-hover:opacity-100 transition-opacity">
           <span className="text-xs font-mono text-ink-400 uppercase tracking-widest font-bold">System Verified</span>
        </div>
      )}
    </div>
  );
};
