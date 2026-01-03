"use client";
import React, { useState } from 'react';
import { updateContainerResources } from '../services/api';

interface ContainerControlProps {
  containerId: string;
  isOpen: boolean;
  onClose: () => void;
  currentMemLimit?: number; // in MB
}

const ContainerControl: React.FC<ContainerControlProps> = ({ containerId, isOpen, onClose, currentMemLimit }) => {
  const [memoryMb, setMemoryMb] = useState<string>(currentMemLimit ? String(currentMemLimit) : "");
  const [cpuQuota, setCpuQuota] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const mem = memoryMb ? parseInt(memoryMb) : undefined;
      const cpu = cpuQuota ? parseFloat(cpuQuota) : undefined;
      await updateContainerResources(containerId, mem, cpu);
      onClose();
    } catch (err: any) {
      setError("Failed to update resources. Ensure values are valid.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-xl w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-white mb-4">🚀 Hot-Update Resources</h3>
        <p className="text-gray-400 text-sm mb-6">Modify limits for Container <strong>{containerId.substring(0, 12)}</strong> without restarting.</p>
        
        {error && <div className="mb-4 text-red-400 text-sm bg-red-900/30 p-2 rounded">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Unlimit RAM (MB)</label>
            <input 
              type="number" 
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="e.g. 512"
              value={memoryMb}
              onChange={(e) => setMemoryMb(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">CPU Cores (Quota)</label>
            <input 
              type="number" 
              step="0.1"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-colors"
              placeholder="e.g. 1.5"
              value={cpuQuota}
              onChange={(e) => setCpuQuota(e.target.value)}
            />
          </div>
          
          <div className="flex justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Apply Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContainerControl;
