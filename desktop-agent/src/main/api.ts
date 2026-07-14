import { getToken, setToken, clearToken } from "./tokenStore";

export interface OfficeNetwork {
  id: number;
  label: string;
  bssid: string;
  ssid: string | null;
  active: boolean;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Session expired or invalid — please log in again.");
  }
}

export class ApiClient {
  constructor(private baseUrl: string) {}

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const token = getToken();
    if (!token) throw new UnauthorizedError();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string> | undefined),
    };
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    if (res.status === 401) {
      clearToken();
      throw new UnauthorizedError();
    }
    return res;
  }

  async login(email: string, password: string): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-client": "desktop" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}) as any);
    if (!res.ok) throw new Error(data?.error || "Login failed.");
    if (data.token) setToken(data.token);
    return data.user;
  }

  async getOfficeNetworks(): Promise<OfficeNetwork[]> {
    const res = await this.request("/api/office-network");
    const data = await res.json();
    return data.networks ?? [];
  }

  async punch(action: "in" | "out"): Promise<void> {
    const res = await this.request("/api/attendance", {
      method: "POST",
      body: JSON.stringify({ action, source: "auto" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}) as any);
      throw new Error(data?.error || `Punch ${action} failed (${res.status})`);
    }
  }

  logout(): void {
    clearToken();
  }
}
