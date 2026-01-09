import { toast } from 'sonner';
import type {
  LoginRequest,
  LoginResponse,
  SignUpRequest,
  SignUpResponse,
  AuthResponse,
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Factory,
  CreateFactoryRequest,
  UpdateFactoryRequest,
  Machine,
  CreateMachineRequest,
  UpdateMachineRequest,
  MachineStatus,
  RealtimeHistoryResponse,
  SPCHistoryResponse,
  HistoryQueryParams,
  Subscription,
  CreateSubscriptionRequest,
  HealthStatus,
  ApiError,
  AlarmHistoryResponse,
} from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface RequestOptions extends RequestInit {
  token?: string;
  skipErrorToast?: boolean;
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
    const { skipErrorToast, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    const token = this.getToken();
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          statusCode: response.status,
          message: response.statusText,
        }));

        // Handle specific error codes
        if (response.status === 401) {
          this.setToken(null);
          if (!skipErrorToast) {
            toast.error('Session expired. Please log in again.');
          }
          window.location.href = '/login';
          throw new Error('Unauthorized');
        }

        if (response.status === 403) {
          if (!skipErrorToast) {
            toast.error('You do not have permission to perform this action.');
          }
          throw new Error(errorData.message || 'Forbidden');
        }

        if (response.status === 404) {
          if (!skipErrorToast) {
            toast.error('Resource not found.');
          }
          throw new Error(errorData.message || 'Not Found');
        }

        if (response.status >= 500) {
          if (!skipErrorToast) {
            toast.error('Server error. Please try again later.');
          }
          throw new Error(errorData.message || 'Server Error');
        }

        if (!skipErrorToast) {
          toast.error(errorData.message || 'An error occurred');
        }
        throw new Error(errorData.message || `API Error: ${response.statusText}`);
      }

      // Handle empty responses
      const text = await response.text();
      if (!text) {
        return {} as T;
      }
      return JSON.parse(text);
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        if (!skipErrorToast) {
          toast.error('Network error. Please check your connection.');
        }
        throw new Error('Network error');
      }
      throw error;
    }
  }

  // ============ Auth Endpoints ============
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipErrorToast: true,
    });
    if (response.access_token) {
      this.setToken(response.access_token);
      toast.success('Login successful');
    }
    return response;
  }

  async signUp(data: SignUpRequest): Promise<SignUpResponse> {
    const response = await this.request<SignUpResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    toast.success('Account created successfully');
    return response;
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/auth/profile');
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    return this.request<AuthResponse>(`/auth/verify-email?token=${token}`);
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    toast.success('Password reset email sent');
  }

  async resetPassword(token: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    toast.success('Password reset successful');
    return response;
  }

  logout() {
    this.setToken(null);
    toast.success('Logged out successfully');
  }

  // ============ Factory Endpoints ============
  async getFactories(): Promise<Factory[]> {
    return this.request<Factory[]>('/factories');
  }

  async getFactory(id: number): Promise<Factory> {
    return this.request<Factory>(`/factories/${id}`);
  }

  async createFactory(data: CreateFactoryRequest): Promise<Factory> {
    const response = await this.request<Factory>('/factories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    toast.success('Factory created successfully');
    return response;
  }

  async updateFactory(id: number, data: UpdateFactoryRequest): Promise<Factory> {
    const response = await this.request<Factory>(`/factories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    toast.success('Factory updated successfully');
    return response;
  }

  async deleteFactory(id: number): Promise<void> {
    await this.request<void>(`/factories/${id}`, {
      method: 'DELETE',
    });
    toast.success('Factory deleted successfully');
  }

  // ============ Machine Endpoints ============
  async getFactoriesAndMachines(): Promise<Factory[]> {
    return this.request<Factory[]>('/machines/factories-machines');
  }

  async getMachines(): Promise<Machine[]> {
    return this.request<Machine[]>('/machines');
  }

  async getMachine(id: number | string): Promise<Machine> {
    return this.request<Machine>(`/machines/${id}`);
  }

  async createMachine(data: CreateMachineRequest): Promise<Machine> {
    const response = await this.request<Machine>('/machines', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    toast.success('Machine created successfully');
    return response;
  }

  async updateMachine(id: number, data: UpdateMachineRequest): Promise<Machine> {
    const response = await this.request<Machine>(`/machines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    toast.success('Machine updated successfully');
    return response;
  }

  async deleteMachine(id: number): Promise<void> {
    await this.request<void>(`/machines/${id}`, {
      method: 'DELETE',
    });
    toast.success('Machine deleted successfully');
  }

  async getMachineStatus(id: number): Promise<MachineStatus> {
    return this.request<MachineStatus>(`/machines/${id}/status`);
  }

  // ============ Historical Data Endpoints ============
  async getRealtimeHistory(
    machineId: number | string,
    params: HistoryQueryParams = {}
  ): Promise<RealtimeHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    if (params.start) queryParams.set('start', params.start);
    if (params.end) queryParams.set('end', params.end);
    if (params.aggregate) queryParams.set('aggregate', params.aggregate);

    const queryString = queryParams.toString();
    return this.request<RealtimeHistoryResponse>(
      `/machines/${machineId}/realtime-history${queryString ? `?${queryString}` : ''}`
    );
  }

  async getSPCHistory(
    machineId: number | string,
    params: HistoryQueryParams = {}
  ): Promise<SPCHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.offset) queryParams.set('offset', params.offset.toString());
    if (params.start) queryParams.set('start', params.start);
    if (params.end) queryParams.set('end', params.end);
    if (params.aggregate) queryParams.set('aggregate', params.aggregate);

    const queryString = queryParams.toString();
    return this.request<SPCHistoryResponse>(
      `/machines/${machineId}/spc-history${queryString ? `?${queryString}` : ''}`
    );
  }

  // ============ User Endpoints (Admin) ============
  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/user');
  }

  async getUser(email: string): Promise<User> {
    return this.request<User>(`/user/${email}`);
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await this.request<User>('/user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    toast.success('User created successfully');
    return response;
  }

  async updateUser(email: string, data: UpdateUserRequest): Promise<User> {
    const response = await this.request<User>(`/user/${email}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    toast.success('User updated successfully');
    return response;
  }

  async deleteUser(email: string): Promise<void> {
    await this.request<void>(`/user/${email}`, {
      method: 'DELETE',
    });
    toast.success('User deleted successfully');
  }

  // ============ Alarm Endpoints ============
  async getMachineAlarms(
    machineId: number | string,
    timeRange: string = '-1h'
  ): Promise<AlarmHistoryResponse> {
    const queryParams = new URLSearchParams();
    if (timeRange) queryParams.set('timeRange', timeRange);

    const queryString = queryParams.toString();
    return this.request<AlarmHistoryResponse>(
      `/machines/${machineId}/alarms${queryString ? `?${queryString}` : ''}`
    );
  }

  // ============ Subscription Endpoints ============
  async getSubscriptions(): Promise<Subscription[]> {
    return this.request<Subscription[]>('/subscriptions');
  }

  async createSubscription(data: CreateSubscriptionRequest): Promise<Subscription> {
    const response = await this.request<Subscription>('/subscriptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    toast.success('Subscription created successfully');
    return response;
  }

  async deleteSubscription(id: number): Promise<void> {
    await this.request<void>(`/subscriptions/${id}`, {
      method: 'DELETE',
    });
    toast.success('Subscription removed successfully');
  }

  // ============ Health Endpoints ============
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health', { skipErrorToast: true });
  }
}

export const api = new ApiClient();
