"use client";
import React from 'react';
import { HostMetrics } from '../services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface HostStatsProps {
  metrics: HostMetrics | null;
}

const Gauge = ({ label, percent, color, value }: { label: string, percent: number, color: string, value: string }) => {
  const data = {
    labels: ['Used', 'Free'],
    datasets: [
      {
        data: [percent, 100 - percent],
        backgroundColor: [color, 'rgba(148, 163, 184, 0.1)'], // Slate-400/10
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
        borderRadius: 20, 
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
    },
    cutout: '75%',
  };

  return (
    <div className="flex flex-col items-center bg-[var(--panel-bg)] border border-[var(--panel-border)] p-5 rounded-xl shadow-sm relative h-48 transition-colors duration-300">
      <h3 className="text-gray-500 dark:text-gray-400 font-semibold text-sm uppercase tracking-wide mb-3 w-full text-left flex items-center gap-2">
         <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
         {label}
      </h3>
      <div className="relative w-full h-28 flex justify-center">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
             <span className="text-3xl font-bold text-gray-900 dark:text-white">{Math.round(percent)}%</span>
        </div>
      </div>
       <div className="mt-auto w-full text-center pt-2">
           <span className="text-sm text-gray-500 font-medium">{value}</span>
       </div>
    </div>
  );
};

const HostStats: React.FC<HostStatsProps> = ({ metrics }) => {
  if (!metrics) return (
     <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
        {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>)}
     </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Gauge 
        label="CPU Usage" 
        percent={metrics.cpu_percent} 
        color="#06b6d4" // Cyan
        value={`${metrics.cpu_percent}% Load`}
      />
      
      <Gauge 
        label="Memory Usage" 
        percent={metrics.memory.percent} 
        color="#8b5cf6" // Violet
        value={`${metrics.memory.used_gb} GB Used`}
      />
      
      <Gauge 
        label="Storage" 
        percent={metrics.disk.percent} 
        color="#3b82f6" // Blue
        value={`${metrics.disk.used_gb} GB Used`}
      />
    </div>
  );
};

export default HostStats;
