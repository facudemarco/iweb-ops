// In development/production via Next.js proxy, use relative path
const API_URL = typeof window !== 'undefined' ? "/api" : "https://ops.iwebtecnology.com/api";


export interface HostMetrics {
  memory: {
    total_gb: number;
    used_gb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    percent: number;
  };
  load_avg: [number, number, number];
  cpu_percent: number;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    Dead: boolean;
  };
}

export interface ContainerDetails {
  id: string;
  name: string;
  status: string;
  metrics: {
    cpu_percent: number;
    memory_usage_mb: number;
    memory_limit_mb: number;
    memory_percent: number;
    net_rx_mb: number;
    net_tx_mb: number;
  };
  logs: string;
}

// Add credentials to include cookies
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const defaultOptions: RequestInit = {
    credentials: "include", // Send cookies
  };
  const res = await fetch(url, { ...defaultOptions, ...options });
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error("Unauthorized");
  }
  return res;
};

export const fetchHostStats = async (): Promise<HostMetrics> => {
  const res = await fetchWithAuth(`${API_URL}/host/stats`);
  if (!res.ok) throw new Error("Failed to fetch host stats");
  return res.json();
};

export const fetchContainers = async (): Promise<Container[]> => {
  const res = await fetchWithAuth(`${API_URL}/containers`);
  if (!res.ok) throw new Error("Failed to fetch containers");
  return res.json();
};

export const fetchContainerDetails = async (id: string): Promise<ContainerDetails> => {
  const res = await fetchWithAuth(`${API_URL}/containers/${id}`);
  if (!res.ok) throw new Error("Failed to fetch container details");
  return res.json();
};

export const performLogin = async (username: string, password: string) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    credentials: "include"
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json();
};

export const performLogout = async () => {
    await fetch(`${API_URL}/auth/logout`, { method: "POST" });
};

export const containerAction = async (id: string, action: "start" | "stop" | "restart") => {
  const res = await fetchWithAuth(`${API_URL}/containers/${id}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error(`Failed to ${action} container`);
  return res.json();
};

export const updateContainerResources = async (id: string, memory_mb?: number, cpu_quota?: number) => {
  const res = await fetchWithAuth(`${API_URL}/containers/${id}/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memory_mb, cpu_quota }),
  });
  if (!res.ok) throw new Error("Failed to update container resources");
  return res.json();
};
