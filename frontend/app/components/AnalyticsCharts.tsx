"use client";
import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
  ChartOptions
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface DataPoint {
  time: string;
  cpu: number;
  ram: number;
}

interface AnalyticsChartsProps {
  data: DataPoint[];
}

const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data }) => {
  
  const chartData = useMemo(() => ({
    labels: data.map(d => d.time),
    datasets: [
      {
        label: 'CPU',
        data: data.map(d => d.cpu),
        borderColor: '#06b6d4', // Cyan
        backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(6,182,212,0.4)');
            gradient.addColorStop(1, 'rgba(6,182,212,0.0)');
            return gradient;
        },
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        fill: true
      },
      {
        label: 'RAM',
        data: data.map(d => d.ram),
        borderColor: '#8b5cf6', // Violet
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
        fill: false
      }
    ]
  }), [data]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false, 
    normalized: true, 
    parsing: false, 
    scales: {
        y: {
            beginAtZero: true,
            max: 100,
            grid: {
                color: 'rgba(148, 163, 184, 0.1)', // Slate-400/10
            },
            ticks: {
                color: '#94a3b8', // Slate-400
                font: { family: 'inherit', size: 10 }
            },
            border: { display: false }
        },
        x: {
            grid: {
                display: false
            },
            ticks: {
                display: true,
                maxTicksLimit: 6,
                color: '#94a3b8',
                font: { family: 'inherit', size: 10 }
            }
        }
    },
    plugins: {
        legend: {
            display: true,
            align: 'end',
            labels: {
                color: '#94a3b8',
                usePointStyle: true,
                boxWidth: 8
            }
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#1e293b',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
        }
    },
    interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
    }
  };

  if (!data || data.length === 0) return <div className="h-64 flex items-center justify-center text-gray-500">Initializing...</div>;

  return (
    <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] p-5 rounded-xl shadow-sm h-80 transition-colors duration-300">
      <div className="flex justify-between items-center mb-4">
        <div>
             <h2 className="text-gray-900 dark:text-white font-bold text-lg">Performance Trends</h2>
             <p className="text-sm text-gray-500">Real-time CPU & Memory analysis</p>
        </div>
      </div>
      <div className="h-60 w-full">
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
};

export default AnalyticsCharts;
