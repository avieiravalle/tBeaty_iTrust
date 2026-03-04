import { Role, Service, User, Appointment, DashboardStats, Product, Client, CommissionStats, Notification, Store, Expense, StaffFinancialStats } from '../types.ts';

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
  email: string;
  phone: string;
  cep: string;
  birth_date?: string;
  password?: string;
  storeId: number;
};

type ClientLoginData = {
  phone: string;
  password: string;
};

type WhatsappMessageData = {
  to: string; // Formato E.164
  message: string;
};

type NewReviewData = {
  appointment_id: number;
  rating: number;
  comment?: string;
  client_id: number; // For authorization check on backend
};

type ApiError = {
  error?: string;
};

const handleApiError = async (res: Response, defaultMessage: string) => {
  let errorMessage = defaultMessage;
  try {
    const err: ApiError = await res.json();
    errorMessage = err.error || defaultMessage;
  } catch (jsonError) {
    // Fallback para respostas que não são JSON
    const textResponse = await res.text().catch(() => '');
    errorMessage = textResponse || defaultMessage;
  }
  throw new Error(errorMessage);
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
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar serviço');
    }
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
  async getStaff(storeId?: number, status: 'all' | 'active' = 'active'): Promise<User[]> {
    const res = await fetch(`/api/staff?storeId=${storeId}&status=${status}`);
    if (!res.ok) {
        await handleApiError(res, 'Falha ao buscar profissionais');
    }
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
  async updateStaffStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    const res = await fetch(`/api/staff/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) {
        await handleApiError(res, 'Falha ao atualizar status do profissional');
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
  async getClients(storeId: number): Promise<(Client & { appointment_count: number })[]> {
    const res = await fetch(`/api/clients?storeId=${storeId}`);
    return res.json();
  },
  async getInactiveClients(storeId: number): Promise<Client[]> {
    const res = await fetch(`/api/opportunities/inactive-clients?storeId=${storeId}`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar clientes inativos');
    return res.json();
  },
  async getBirthdayClients(storeId: number): Promise<Client[]> {
    // NOTE: The backend is currently returning random clients for demonstration.
    // A real implementation would require a birth_date field.
    const res = await fetch(`/api/opportunities/birthday-clients?storeId=${storeId}`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar aniversariantes');
    return res.json();
  },
  async updateClient(id: number, data: Partial<Omit<Client, 'id'>>): Promise<void> {
    const res = await fetch(`/api/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar cliente');
    }
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
  async addReview(data: NewReviewData): Promise<{ id: number }> {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao enviar avaliação');
    }
    return res.json();
  },
  async getAppointments(storeId?: number): Promise<Appointment[]> {
    const res = await fetch(`/api/appointments?storeId=${storeId}`);
    return res.json();
  },
  async getAvailability(professionalId: number, date: string, duration: number, storeId: number): Promise<string[]> {
    const res = await fetch(`/api/availability?professionalId=${professionalId}&date=${date}&duration=${duration}&storeId=${storeId}`);
    if (!res.ok) {
        await handleApiError(res, 'Falha ao buscar horários disponíveis');
    }
    return res.json();
  },
  async createAppointment(data: NewAppointmentData): Promise<{ ids: number[] }> {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao criar agendamento');
    }
    return res.json();
  },
  async updateAppointmentStatus(id: number, status: Appointment['status']): Promise<void> {
    const res = await fetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar status');
    }
  },
  async getDashboardStats(storeId: number, period: string, category: string): Promise<DashboardStats> {
    const res = await fetch(`/api/dashboard/stats?storeId=${storeId}&period=${period}&category=${category}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar estatísticas');
    }
    return res.json();
  },
  async getStaffDashboardStats(storeId: number, period: string): Promise<StaffFinancialStats[]> {
    const res = await fetch(`/api/dashboard/staff-stats?storeId=${storeId}&period=${period}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar estatísticas dos profissionais');
    }
    return res.json();
  },
  async getCommissionStats(userId: number): Promise<CommissionStats> {
    const res = await fetch(`/api/commissions/${userId}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar estatísticas de comissão');
    }
    return res.json();
  },
  async getProducts(storeId: number): Promise<Product[]> {
    const res = await fetch(`/api/products?storeId=${storeId}`);
    return res.json();
  },
  async addProduct(product: Omit<Product, 'id'> & { storeId: number }): Promise<{ id: number }> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar produto');
    }
    return res.json();
  },
  async updateProduct(id: number, data: { stock_quantity: number, price: number }): Promise<void> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar produto');
    }
  },
  async deleteProduct(id: number): Promise<void> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir produto');
    }
  },
  async getExpenses(storeId: number): Promise<Expense[]> {
    const res = await fetch(`/api/expenses?storeId=${storeId}`);
    return res.json();
  },
  async addExpense(expense: Omit<Expense, 'id' | 'date'> & { storeId: number }): Promise<{ id: number }> {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar custo');
    }
    return res.json();
  },
  async uploadImage(imageFile: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const res = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
      // Nota: Não defina o cabeçalho Content-Type, o navegador faz isso por você com o boundary correto.
    });

    if (!res.ok) {
      await handleApiError(res, 'Falha ao enviar imagem.');
    }
    return res.json();
  },
  async sendWhatsappMessage(data: WhatsappMessageData): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao enviar mensagem de WhatsApp');
    }
    return res.json();
  },
  async getWhatsappStatus(): Promise<{ status: string; qrCode: string | null }> {
    const res = await fetch('/api/whatsapp/status');
    return res.json();
  },
  async logoutWhatsapp(): Promise<void> {
    const res = await fetch('/api/whatsapp/logout', { method: 'POST' });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao desconectar WhatsApp');
    }
  },
  async getSettings(storeId: number): Promise<Record<string, string>> {
    const res = await fetch(`/api/settings?storeId=${storeId}`);
    return res.json();
  },
  async updateSettings(storeId: number, settings: Record<string, string>): Promise<void> {
    const res = await fetch('/api/settings', {
      method: 'POST', // The backend uses POST for upsert
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
    const res = await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao marcar notificação como lida');
    }
  },
  async clearNotifications(userId: number, storeId: number): Promise<void> {
    const res = await fetch(`/api/notifications/clear?userId=${userId}&storeId=${storeId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao limpar notificações');
    }
  },
};