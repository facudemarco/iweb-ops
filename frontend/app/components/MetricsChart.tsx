"use client"
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

interface ChartProps {
  type: 'host' | 'container';
  containerName?: string;
  title?: string;
  mode?: string;
}

export default function MetricsChart({ type, containerName }: ChartProps) {
  const [data, setData] = useState([]);
  const [range, setRange] = useState('1h');

  useEffect(() => {
    fetch(`https://ops.iwebtecnology.com/api/history/${type}?range=${range}&container=${containerName || ''}`)
      .then(res => res.json())
      .then(json => {
        // Convertir timestamp unix a fecha legible JS
        const formatted = json.map((item: any) => ({
          ...item,
          date: new Date(item.ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));
        setData(formatted);
      });
  }, [range, type, containerName]);

  return (
    <div className="bg-[#1e293b] p-4 rounded-xl border border-[#334155] mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-200 font-bold">Histórico de Rendimiento</h3>
        
        {/* Selector de Rango */}
        <div className="flex bg-[#0f172a] rounded-lg p-1 gap-1">
          {['1h', '24h', '7d', '30d'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                range === r ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="cpu" 
              stroke="#8b5cf6" 
              fillOpacity={1} 
              fill="url(#colorCpu)" 
              name="CPU %"
            />
            <Area 
              type="monotone" 
              dataKey="ram" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorRam)" 
              name="RAM %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}