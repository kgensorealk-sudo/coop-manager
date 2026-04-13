
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorClass?: string;
  index?: number;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  colorClass = "text-ink-800",
  index = 0
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="bg-paper-50 border-2 border-paper-200 p-6 relative overflow-hidden group hover:border-gold-400 hover:shadow-xl transition-all duration-500 cursor-default rounded-xl"
    >
      
      {/* Aesthetic: Corner decorative lines that expand on hover */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-paper-300 group-hover:border-gold-500 transition-all duration-500"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-paper-300 group-hover:border-gold-500 transition-all duration-500"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-paper-300 group-hover:border-gold-500 transition-all duration-500"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-paper-300 group-hover:border-gold-500 transition-all duration-500"></div>

      {/* Background Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.08] transition-opacity" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'0.5\'/%3E%3C/g%3E%3C/svg%3E")' }}></div>

      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="space-y-1">
          <h3 className="text-ink-500 text-[10px] font-black uppercase tracking-[0.3em] font-sans opacity-80 group-hover:opacity-100 transition-opacity">
            {title}
          </h3>
          <p className="text-3xl font-serif font-bold text-ink-900 tracking-tight leading-none group-hover:text-gold-600 transition-colors">
            {value}
          </p>
        </div>
        
        {/* Icon Container with "Seal" effect */}
        <div className={`relative p-3 rounded-2xl border-2 border-dashed border-paper-300 ${colorClass} bg-paper-100 group-hover:rotate-12 group-hover:scale-110 group-hover:border-gold-400 transition-all duration-500 shadow-sm`}>
          <Icon size={24} strokeWidth={1.5} className="relative z-10" />
          <div className="absolute inset-0 bg-white/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
        </div>
      </div>
      
      {trend ? (
        <div className="flex items-center pt-4 border-t border-paper-200 border-dashed relative z-10">
           <span className={`text-sm font-serif italic flex items-center gap-2 ${trendUp ? 'text-emerald-700' : 'text-wax-600'}`}>
             <div className={`w-1.5 h-1.5 rounded-full ${trendUp ? 'bg-emerald-500' : 'bg-wax-500'} shadow-[0_0_8px_rgba(16,185,129,0.5)]`}></div>
             {trend}
           </span>
        </div>
      ) : (
        <div className="pt-4 border-t border-paper-200 border-dashed opacity-40 group-hover:opacity-100 transition-opacity">
           <span className="text-[9px] font-mono text-ink-400 uppercase tracking-[0.2em] font-black">Ledger Verified</span>
        </div>
      )}
    </motion.div>
  );
};
