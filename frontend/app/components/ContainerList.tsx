"use client";
import React, { useEffect, useState } from 'react';
import { Container, fetchContainers, fetchContainerDetails, ContainerDetails, containerAction } from '../services/api';
import ContainerControl from './ContainerControl';
import ContainerLogs from './ContainerLogs';
import { Terminal, MoreVertical, Play, Square, RefreshCcw, Cpu } from 'lucide-react';

const ContainerRow = ({ 
  container, 
  onHotUpdate,
  onViewLogs
}: { 
  container: Container, 
  onHotUpdate: (id: string, currentMem: number) => void;
  onViewLogs: (id: string) => void;
}) => {
  const [loadingAction, setLoadingAction] = useState(false);

  // We can simplify by removing per-row details polling for cleaner UI, or keep it subtle.
  // For corporate look, let's keep it but cleaner.
  
  const handleAction = async (action: "start" | "stop" | "restart") => {
    setLoadingAction(true);
    try {
      await containerAction(container.id, action);
    } catch (e) {
      alert("Action failed");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <tr className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
      <td className="p-4">
         <div className="flex items-center gap-4">
             <div className={`w-2.5 h-2.5 rounded-full ${container.state.Running ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`}></div>
             <div>
                 <div className="font-semibold text-gray-900 dark:text-white text-sm">{container.name.replace(/^\//, '')}</div>
                 <div className="text-xs text-gray-500 font-mono mt-0.5">{container.id.substring(0, 12)}</div>
             </div>
         </div>
      </td>
      <td className="p-4 text-gray-500 text-sm font-mono">{container.image}</td>
      <td className="p-4">
         <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${container.state.Running ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-400"}`}>
            {container.status}
         </span>
      </td>
      <td className="p-4 text-right">
        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!container.state.Running ? (
            <button onClick={() => handleAction("start")} disabled={loadingAction} className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-md text-xs font-medium transition-colors">
                <Play size={14} /> Start
            </button>
          ) : (
             <>
                <button onClick={() => onViewLogs(container.id)} className="p-2 text-gray-400 hover:text-brand-secondary hover:bg-blue-50 dark:hover:bg-slate-700/50 rounded-md transition-colors" title="Logs">
                    <Terminal size={16} />
                </button>
                <button onClick={() => onHotUpdate(container.id, 0)} className="p-2 text-gray-400 hover:text-brand-primary hover:bg-cyan-50 dark:hover:bg-slate-700/50 rounded-md transition-colors" title="Resources">
                    <Cpu size={16} />
                </button>
                <button onClick={() => handleAction("restart")} className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-700/50 rounded-md transition-colors" title="Restart">
                    <RefreshCcw size={16} />
                </button>
                <button onClick={() => handleAction("stop")} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-700/50 rounded-md transition-colors" title="Stop">
                    <Square size={16} fill="currentColor" />
                </button>
             </>
          )}
        </div>
      </td>
    </tr>
  );
};

const ContainerList = () => {
  const [containers, setContainers] = useState<Container[]>([]);
  const [controlId, setControlId] = useState<string | null>(null);
  const [logsId, setLogsId] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      const data = await fetchContainers();
      setContainers(data);
    } catch (e) { }
  };

  useEffect(() => {
    fetchList();
    const interval = setInterval(fetchList, 3000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl shadow-sm flex flex-col overflow-hidden">
      <div className="p-5 border-b border-[var(--panel-border)] flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
        <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Active Containers</h2>
            <p className="text-sm text-gray-500">Manage your deployment fleet</p>
        </div>
        <span className="bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 px-3 py-1 rounded-md text-xs font-mono font-medium text-gray-600 dark:text-gray-300 shadow-sm">
          {containers.length} Total
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
              <th className="p-4 rounded-tl-lg">Instance</th>
              <th className="p-4">Image / Tag</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right rounded-tr-lg">Quick Actions</th>
            </tr>
          </thead>
          <tbody>
            {containers.map((c) => (
              <ContainerRow 
                key={c.id} 
                container={c} 
                onHotUpdate={(id, mem) => { setControlId(id); }} 
                onViewLogs={(id) => setLogsId(id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <ContainerControl 
        isOpen={!!controlId} 
        containerId={controlId || ""} 
        onClose={() => setControlId(null)}
      />
      
      {logsId && (
        <ContainerLogs 
            isOpen={!!logsId} 
            containerId={logsId} 
            onClose={() => setLogsId(null)} 
        />
      )}
    </div>
  );
};

export default ContainerList;
