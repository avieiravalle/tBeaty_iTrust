import { Role, Service, User, Appointment, DashboardStats, Product, Client, CommissionStats, Notification, Store, Expense } from '../types.ts';

type StoreRegistrationData = {
  storeName: string;
  userName: string;
  email: string;
  password: string;
  storeCode?: string;
};

type StoreRegistrationResult = {
  storeId: number;
  userId: number;
  storeCode: string;
};

type CollaboratorRegistrationData = {
  storeCode: string;
  userName: string;
  email: string;
  password: string;
};

type CollaboratorRegistrationResult = {
  userId: number;
  storeId: number;
};

type LoginData = {
  email: string;
  password: string;
};

type NewAppointmentData = {
  client_id: number;
  professional_id: number;
  service_ids: number[];
  start_time: string;
  storeId: number;
};

type ClientRegistrationData = {
  name: string;
  phone: string;
  cep: string;
  password: string;
};

type ClientLoginData = {
  phone: string;
  password: string;
};

type ApiError = {
  error?: string;
};

const handleApiError = async (res: Response, defaultMessage: string) => {
  const err: ApiError = await res.json();
  throw new Error(err.error || defaultMessage);
};

export const api = {
  async registerStore(data: StoreRegistrationData): Promise<StoreRegistrationResult> {
    const res = await fetch('/api/auth/register-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Erro ao registrar loja');
    }
    return res.json();
  },
  async registerCollaborator(data: CollaboratorRegistrationData): Promise<CollaboratorRegistrationResult> {
    const res = await fetch('/api/auth/register-collaborator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Erro ao registrar colaborador');
    }
    return res.json();
  },
  async login(data: LoginData): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Credenciais inválidas');
    }
    return res.json();
  },
  async registerClient(data: ClientRegistrationData): Promise<Client> {
    const res = await fetch('/api/auth/register-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Erro ao registrar cliente');
    }
    return res.json();
  },
  async loginClient(data: ClientLoginData): Promise<Client> {
    const res = await fetch('/api/auth/client-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Telefone ou senha inválidos.');
    }
    return res.json();
  },
  async getStores(): Promise<Store[]> {
    const res = await fetch('/api/stores');
    return res.json();
  },
  async getServices(storeId?: number): Promise<Service[]> {
    const res = await fetch(`/api/services?storeId=${storeId}`);
    return res.json();
  },
  async addService(service: Omit<Service, 'id'> & { storeId: number }): Promise<{ id: number }> {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    return res.json();
  },
  async updateService(id: number, data: Omit<Service, 'id'>): Promise<void> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar serviço');
    }
  },
  async deleteService(id: number): Promise<void> {
    const res = await fetch(`/api/services/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir serviço');
    }
  },
  async getStaff(storeId?: number): Promise<User[]> {
    const res = await fetch(`/api/staff?storeId=${storeId}`);
    return res.json();
  },
  async getStaffServiceCommissions(userId: number): Promise<Record<string, number>> {
    const res = await fetch(`/api/staff/${userId}/service-commissions`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar comissões específicas');
    }
    return res.json();
  },
  async updateStaffServiceCommissions(userId: number, commissions: Record<string, number | string>): Promise<void> {
    const res = await fetch(`/api/staff/${userId}/service-commissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commissions }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar comissões específicas');
    }
  },
  async addStaff(data: Partial<User> & { password?: string }): Promise<{ id: number }> {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar profissional');
    }
    return res.json();
  },
  async updateStaff(id: number, data: Partial<User>): Promise<void> {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar profissional');
    }
  },
  async deleteStaff(id: number): Promise<void> {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir profissional');
    }
  },
  async getClients(): Promise<Client[]> {
    const res = await fetch(`/api/clients`);
    return res.json();
  },
  async getClientHistory(id: number): Promise<Appointment[]> {
    const res = await fetch(`/api/clients/${id}/history`);
    return res.json();
  },
  async getClientAppointments(clientId: number): Promise<Appointment[]> {
    const res = await fetch(`/api/clients/${clientId}/appointments`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar agendamentos do cliente');
    }
    return res.json();
  },
  async getAppointments(storeId?: number): Promise<Appointment[]> {
    const res = await fetch(`/api/appointments?storeId=${storeId}`);
    return res.json();
  },
  async createAppointment(appointment: NewAppointmentData): Promise<{ ids: number[] }> {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointment),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao criar agendamento');
    }
    return res.json();
  },
  async updateAppointmentStatus(id: number, status: Appointment['status']): Promise<void> {
    await fetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
  },
  async getCommissionStats(userId: number): Promise<CommissionStats> {
    const res = await fetch(`/api/commissions/${userId}`);
    return res.json();
  },
  async getDashboardStats(storeId?: number, period: string = 'monthly', category: string = 'all'): Promise<DashboardStats> {
    const res = await fetch(`/api/dashboard/stats?storeId=${storeId}&period=${period}&category=${category}`);
    return res.json();
  },
  async getExpenses(storeId: number): Promise<Expense[]> {
    const res = await fetch(`/api/expenses?storeId=${storeId}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar despesas');
    }
    return res.json();
  },
  async addExpense(data: { description: string, amount: number, storeId: number }): Promise<{ id: number }> {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar despesa');
    }
    return res.json();
  },
  async getProducts(storeId?: number): Promise<Product[]> {
    const res = await fetch(`/api/products?storeId=${storeId}`);
    return res.json();
  },
  async addProduct(product: Omit<Product, 'id'> & { storeId: number }): Promise<{ id: number }> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    return res.json();
  },
  async updateProduct(id: number, data: Partial<Product>): Promise<void> {
    await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  async deleteProduct(id: number): Promise<void> {
    await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
  },
  async getSettings(storeId?: number): Promise<Record<string, string>> {
    const res = await fetch(`/api/settings?storeId=${storeId}`);
    return res.json();
  },
  async updateSettings(storeId: number, settings: Record<string, string>): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, settings }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar configurações');
    }
  },
  async getNotifications(userId: number, storeId: number): Promise<Notification[]> {
    const res = await fetch(`/api/notifications?userId=${userId}&storeId=${storeId}`);
    return res.json();
  },
  async markNotificationRead(id: number): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },
  async clearNotifications(userId: number, storeId: number): Promise<void> {
    await fetch(`/api/notifications/clear?userId=${userId}&storeId=${storeId}`, { method: 'DELETE' });
  }
};
