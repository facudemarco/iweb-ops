"use client";
import React, { useEffect, useState, useRef } from 'react';
import { fetchContainerDetails, ContainerDetails } from '../services/api';
import { X, RefreshCw } from 'lucide-react';

interface ContainerLogsProps {
  containerId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ContainerLogs: React.FC<ContainerLogsProps> = ({ containerId, isOpen, onClose }) => {
  const [logs, setLogs] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      const details = await fetchContainerDetails(containerId);
      setLogs(details.logs || "No logs available.");
    } catch (e) {
      setLogs("Error fetching logs.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchLogs().then(() => setLoading(false));
    }
  }, [isOpen, containerId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && autoRefresh) {
      interval = setInterval(fetchLogs, 3000); // Poll logs every 3s
    }
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, containerId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#1e1e2e] border border-gray-700 w-full max-w-4xl h-[80vh] rounded-xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking inside
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-[#181825]">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-mono font-bold text-gray-200">
                    &gt;_ Logs: <span className="text-cyan-400">{containerId.substring(0, 12)}</span>
                </h3>
                {loading && <RefreshCw size={14} className="animate-spin text-gray-500" />}
            </div>
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        checked={autoRefresh} 
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0"
                    />
                    <span>Auto-scrolling</span>
                </label>
                <button 
                    onClick={onClose}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors shadow-lg"
                >
                    CLOSE
                </button>
            </div>
        </div>

        {/* content */}
        <div className="flex-1 overflow-auto p-4 font-mono text-xs md:text-sm text-gray-300 bg-[#0f0f16] whitespace-pre-wrap leading-tight">
            {logs}
            <div ref={logsEndRef} />
        </div>
      </div>
    </div>
  );
};

export default ContainerLogs;
