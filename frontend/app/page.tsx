"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Activity } from "lucide-react";

// Components
import HostStats from "./components/HostStats";
import ContainerList from "./components/ContainerList";
import ThemeToggle from "./components/ThemeToggle";
import MetricsChart from './components/MetricsChart';

// Services
import { fetchHostStats, performLogout, HostMetrics } from "./services/api";

export default function Home() {
  const [hostMetrics, setHostMetrics] = useState<HostMetrics | null>(null);
  const router = useRouter();

  // Polling only for the "large numbers" of the current moment (HostStats)
  useEffect(() => {
    const loadHost = async () => {
      try {
        const data = await fetchHostStats();
        setHostMetrics(data);
      } catch (e: any) {
        if (e.message === "Unauthorized") {
           // handled by api interceptor mostly, or redirect here
           router.push('/login');
        }
      }
    };
    
    loadHost();
    const interval = setInterval(loadHost, 2000); 
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = async () => {
    await performLogout();
    router.push('/login');
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 md:p-6 font-sans text-sm transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* --- Header --- */}
        <header className="flex justify-between items-center bg-[var(--panel-bg)] border border-[var(--panel-border)] px-6 py-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
             <img src="/logo.png" alt="Company Logo" className="h-10 w-auto object-contain" />
             <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                  Ops Center
                </h1>
                <p className="text-xs text-brand-secondary font-medium mt-1">
                  Production Environment
                </p>
             </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">System Status</span>
                <div className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${hostMetrics ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-red-100 text-red-700"}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${hostMetrics ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}></div>
                    {hostMetrics ? "OPERATIONAL" : "OFFLINE"}
                </div>
             </div>
             <ThemeToggle />
             <div className="h-8 w-px bg-gray-200 dark:bg-slate-700"></div>
             <button 
              onClick={handleLogout}
              className="group flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <div className="p-2 rounded-lg group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                  <LogOut size={18} />
              </div>
            </button>
          </div>
        </header>

        {/* --- Grid Layout --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Host Stats (Top cards) */}
            <div className="lg:col-span-3">
                 <HostStats metrics={hostMetrics} />
            </div>

            {/* 2. Central Area: Charts and Widgets */}
            <div className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Chart (2/3 width) */}
                <div className="lg:col-span-2">
                    {/* NEW CHART HERE */}
                    <MetricsChart 
                        title="Historical Performance (CPU / RAM)" 
                        type="host" 
                        mode="resources" 
                    />
                </div>
                
                {/* Right Panel (1/3 width) */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] p-5 rounded-xl shadow-sm flex-1 flex flex-col justify-center items-center text-center">
                        <div className="p-4 bg-blue-50 dark:bg-slate-800 rounded-full mb-3">
                            <Activity className="text-brand-primary" size={24} />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white">System Health</h3>
                        <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                            All systems nominal. The chart shows the trend from the last hour.
                        </p>
                    </div>
                </div>
            </div>
          
            {/* 3. Container List */}
            <div className="lg:col-span-3">
                <ContainerList />
            </div>
        </div>
      </div>
    </main>
  );
}