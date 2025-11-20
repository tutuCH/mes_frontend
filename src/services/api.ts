const BASE_URL = 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as any)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Auth
  async login(credentials: any) {
    return this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Factories & Machines
  async getFactoriesAndMachines() {
    return this.request<any[]>('/machines/factories-machines');
  }

  async getMachine(id: string) {
    return this.request<any>(`/machines/${id}`);
  }

  // Historical Data
  async getRealtimeHistory(machineId: string | number, params: any = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request<{ data: any[] }>(`/machines/${machineId}/realtime-history?${queryParams}`);
  }

  async getSPCHistory(machineId: string | number, params: any = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request<{ data: any[] }>(`/machines/${machineId}/spc-history?${queryParams}`);
  }
}

export const api = new ApiClient();
