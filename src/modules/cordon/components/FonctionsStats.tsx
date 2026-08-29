import React from 'react';
import { DonutChart } from '../../../monapp/components/DonutChart';

interface FonctionsStatsProps {
  functions: Record<string, number>;
  total: number;
}

const COLORS = [
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#6366f1', // indigo-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#ef4444', // red-500
  '#84cc16', // lime-500
];

export const FonctionsStats: React.FC<FonctionsStatsProps> = ({ functions, total }) => {
  const chartData = Object.entries(functions)
    .sort((a, b) => b[1] - a[1]) // Sort by count descending
    .map(([label, value], index) => ({
      label,
      value,
      color: COLORS[index % COLORS.length]
    }));

  return (
    <div className="animate-in fade-in slide-in-from-left-6 duration-500 space-y-4">
      <div className="bg-theme-surface p-4 rounded-xl border border-theme-border text-center transition-theme">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-theme-accent-end">
          Structuration par Rôles
        </h3>
        <p className="text-[8px] text-theme-text-secondary font-bold uppercase mt-1">
          Distribution des responsabilités au sein de l'entité
        </p>
      </div>
      
      <div className="bg-theme-surface backdrop-blur-xl p-6 rounded-2xl border border-theme-border shadow-md flex justify-center">
        <DonutChart 
          data={chartData} 
          title={total.toString()} 
          subtitle="Membres"
        />
      </div>
    </div>
  );
};
