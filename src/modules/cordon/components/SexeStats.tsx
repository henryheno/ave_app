import React from 'react';
import { DonutChart } from '../../../monapp/components/DonutChart';

interface SexeStatsProps {
  stats: {
    total: number;
    male: number;
    female: number;
  };
}

export const SexeStats: React.FC<SexeStatsProps> = ({ stats }) => {
  const chartData = [
    { label: 'Hommes', value: stats.male, color: '#3b82f6' }, // blue-500
    { label: 'Femmes', value: stats.female, color: '#ec4899' }, // pink-500
  ];

  return (
    <div className="animate-in fade-in zoom-in duration-500 bg-theme-surface backdrop-blur-xl p-6 rounded-2xl border border-theme-border space-y-6 transition-theme">
      <div className="text-center space-y-1">
        <h3 className="text-xs font-black uppercase tracking-[0.25em] text-theme-accent-end">
          Statistiques Par Genre
        </h3>
      </div>
      
      <div className="py-4 border-y border-theme-border transition-theme flex justify-center">
        <DonutChart 
          data={chartData} 
          title={stats.total.toString()} 
          subtitle="Total"
        />
      </div>
    </div>
  );
};
