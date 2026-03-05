import { Role, Service, User, Appointment, DashboardStats, Product, Client, CommissionStats, Notification, Store, Expense, StaffFinancialStats, ClientSpendingStats, AdminDashboardStats } from '../types.ts';

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
};

type ClientRegistrationData = {
  name: string;
  email: string;
  phone: string;
  cep: string;
  birth_date?: string;
  password?: string;
  storeId?: number;
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

const authedFetch = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('session_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  // Para FormData, o navegador define o Content-Type com o boundary correto.
  if (options.body instanceof FormData) {
    delete (headers as Record<string, string>)['Content-Type'];
  }

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Token inválido ou sessão expirada. Limpa a sessão e redireciona para o login.
    localStorage.removeItem('session_token');
    localStorage.removeItem('user'); // ou a chave que você usa para os dados do usuário
    window.location.href = '/login'; 
    throw new Error('Sessão inválida. Por favor, faça o login novamente.');
  }

  return res;
};

type PlanSelectionResult = {
  price: number;
  pixKey: string;
  storeName: string;
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
    const user = await res.json();
    // Após o login, armazena o token para ser usado em requisições autenticadas
    if (user.session_token) {
      localStorage.setItem('session_token', user.session_token);
    }
    return user;
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
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/request-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao solicitar redefinição de senha');
    }
    return res.json();
  },
  async requestClientPasswordReset(phone: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/request-client-password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) {
      // Silently fail on the client-side to prevent phone number enumeration
      // but return a generic success-like object to the UI handler.
      console.error('Falha ao solicitar redefinição de senha do cliente');
    }
    return res.json();
  },
  async getStores(clientId?: number): Promise<Store[]> {
    const url = clientId ? `/api/stores?clientId=${clientId}` : '/api/stores';
    const res = await fetch(url);
    return res.json();
  },
  async selectPlan(storeId: number, planId: string): Promise<PlanSelectionResult> {
    const res = await fetch('/api/plans/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, planId }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Erro ao selecionar o plano');
    }
    return res.json();
  },
  async getServices(): Promise<Service[]> {
    const res = await authedFetch(`/api/services`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar serviços');
    return res.json();
  },
  async addService(service: Omit<Service, 'id' | 'store_id'>): Promise<{ id: number }> {
    const res = await authedFetch('/api/services', {
      method: 'POST',
      body: JSON.stringify(service),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar serviço');
    }
    return res.json();
  },
  async updateService(id: number, data: Partial<Omit<Service, 'id' | 'store_id'>>): Promise<void> {
    const res = await authedFetch(`/api/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar serviço');
    }
  },
  async deleteService(id: number): Promise<void> {
    const res = await authedFetch(`/api/services/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir serviço');
    }
  },
  async getStaff(status: 'all' | 'active' = 'active'): Promise<User[]> {
    const res = await authedFetch(`/api/staff?status=${status}`);
    if (!res.ok) {
        await handleApiError(res, 'Falha ao buscar profissionais');
    }
    return res.json();
  },
  async getStaffServiceCommissions(userId: number): Promise<Record<string, number>> {
    const res = await authedFetch(`/api/staff/${userId}/service-commissions`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar comissões específicas');
    }
    return res.json();
  },
  async updateStaffServiceCommissions(userId: number, commissions: Record<string, number | string>): Promise<void> {
    const res = await authedFetch(`/api/staff/${userId}/service-commissions`, {
      method: 'POST',
      body: JSON.stringify({ commissions }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar comissões específicas');
    }
  },
  async addStaff(data: Omit<User, 'id' | 'store_id' | 'role' | 'password'>): Promise<{ id: number }> {
    const res = await authedFetch('/api/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar profissional');
    }
    return res.json();
  },
  async updateStaff(id: number, data: Partial<User>): Promise<void> {
    const res = await authedFetch(`/api/staff/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar profissional');
    }
  },
  async updateStaffStatus(id: number, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
    const res = await authedFetch(`/api/staff/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    });
    if (!res.ok) {
        await handleApiError(res, 'Falha ao atualizar status do profissional');
    }
  },
  async deleteStaff(id: number): Promise<void> {
    const res = await authedFetch(`/api/staff/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir profissional');
    }
  },
  async getClients(): Promise<(Client & { appointment_count: number })[]> {
    const res = await authedFetch(`/api/clients`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar clientes');
    return res.json();
  },
  async searchClients(query: string): Promise<Client[]> {
    if (query.length < 2) return Promise.resolve([]);
    const res = await authedFetch(`/api/clients/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar clientes');
    }
    return res.json();
  },
  async getInactiveClients(): Promise<Client[]> {
    const res = await authedFetch(`/api/opportunities/inactive-clients`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar clientes inativos');
    return res.json();
  },
  async getBirthdayClients(): Promise<Client[]> {
    const res = await authedFetch(`/api/opportunities/birthday-clients`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar aniversariantes');
    return res.json();
  },
  async updateClient(id: number, data: Partial<Omit<Client, 'id'>>): Promise<{ success: boolean }> {
    const res = await authedFetch(`/api/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar cliente');
    }
    return res.json();
  },
  async getClientHistory(id: number): Promise<Appointment[]> {
    const res = await authedFetch(`/api/clients/${id}/history`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar histórico do cliente');
    return res.json();
  },
  async getClientAppointments(clientId: number): Promise<Appointment[]> {
    const res = await fetch(`/api/clients/${clientId}/appointments`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar agendamentos do cliente');
    }
    return res.json();
  },
  async getClientSpending(clientId: number): Promise<ClientSpendingStats> {
    const res = await fetch(`/api/clients/${clientId}/spending`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar dados de gastos');
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
  async addFavoriteStore(clientId: number, storeId: number): Promise<void> {
    const res = await fetch(`/api/clients/${clientId}/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao favoritar salão');
    }
  },
  async removeFavoriteStore(clientId: number, storeId: number): Promise<void> {
    const res = await fetch(`/api/clients/${clientId}/favorites/${storeId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao desfavoritar salão');
    }
  },
  async getAppointments(): Promise<Appointment[]> {
    const res = await authedFetch(`/api/appointments`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar agendamentos');
    return res.json();
  },
  async getAvailability(professionalId: number, date: string, duration: number): Promise<string[]> {
    const res = await authedFetch(`/api/availability?professionalId=${professionalId}&date=${date}&duration=${duration}`);
    if (!res.ok) {
        await handleApiError(res, 'Falha ao buscar horários disponíveis');
    }
    return res.json();
  },
  async createAppointment(data: NewAppointmentData): Promise<{ ids: number[] }> {
    const res = await authedFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao criar agendamento');
    }
    return res.json();
  },
  async updateAppointmentStatus(id: number, status: Appointment['status']): Promise<void> {
    const res = await authedFetch(`/api/appointments/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar status');
    }
  },
  async getDashboardStats(period: string, category: string): Promise<DashboardStats> {
    const res = await authedFetch(`/api/dashboard/stats?period=${period}&category=${category}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar estatísticas');
    }
    return res.json();
  },
  async getStaffDashboardStats(period: string): Promise<StaffFinancialStats[]> {
    const res = await authedFetch(`/api/dashboard/staff-stats?period=${period}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar estatísticas dos profissionais');
    }
    return res.json();
  },
  async getCommissionStats(userId: number): Promise<CommissionStats> {
    const res = await authedFetch(`/api/commissions/${userId}`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar estatísticas de comissão');
    }
    return res.json();
  },
  async getProducts(): Promise<Product[]> {
    const res = await authedFetch(`/api/products`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar produtos');
    return res.json();
  },
  async addProduct(product: Omit<Product, 'id' | 'store_id'>): Promise<{ id: number }> {
    const res = await authedFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar produto');
    }
    return res.json();
  },
  async updateProduct(id: number, data: { stock_quantity: number, price: number }): Promise<void> {
    const res = await authedFetch(`/api/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar produto');
    }
  },
  async deleteProduct(id: number): Promise<void> {
    const res = await authedFetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir produto');
    }
  },
  async getExpenses(): Promise<Expense[]> {
    const res = await authedFetch(`/api/expenses`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar custos');
    return res.json();
  },
  async addExpense(expense: Omit<Expense, 'id' | 'date' | 'store_id' | 'user_id'>): Promise<{ id: number }> {
    const res = await authedFetch('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar custo');
    }
    return res.json();
  },
  async deleteExpense(id: number): Promise<void> {
    const res = await authedFetch(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir custo');
    }
  },
  async addCollaboratorExpense(expense: { description: string, amount: number }): Promise<{ id: number }> {
    const res = await authedFetch('/api/collaborator/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao adicionar custo do colaborador');
    }
    return res.json();
  },
  async deleteCollaboratorExpense(id: number): Promise<void> {
    const res = await authedFetch(`/api/collaborator/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao excluir custo do colaborador');
    }
  },
  async uploadImage(imageFile: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const res = await authedFetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      await handleApiError(res, 'Falha ao enviar imagem.');
    }
    return res.json();
  },
  async sendWhatsappMessage(data: WhatsappMessageData): Promise<{ success: boolean; message: string }> {
    const res = await authedFetch('/api/whatsapp/send', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao enviar mensagem de WhatsApp');
    }
    return res.json();
  },
  async getWhatsappStatus(): Promise<{ status: string; qrCode: string | null }> {
    const res = await authedFetch('/api/whatsapp/status');
    if (!res.ok) await handleApiError(res, 'Falha ao buscar status do WhatsApp');
    return res.json();
  },
  async logoutWhatsapp(): Promise<void> {
    const res = await authedFetch('/api/whatsapp/logout-wa', { method: 'POST' });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao desconectar WhatsApp');
    }
  },
  async getSettings(): Promise<Record<string, string>> {
    const res = await authedFetch(`/api/settings`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar configurações');
    return res.json();
  },
  async updateSettings(settings: Record<string, string>): Promise<void> {
    const res = await authedFetch('/api/settings', {
      method: 'POST', // The backend uses POST for upsert
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar configurações');
    }
  },
  async getNotifications(): Promise<Notification[]> {
    const res = await authedFetch(`/api/notifications`);
    if (!res.ok) await handleApiError(res, 'Falha ao buscar notificações');
    return res.json();
  },
  async markNotificationRead(id: number): Promise<void> {
    const res = await authedFetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao marcar notificação como lida');
    }
  },
  async clearNotifications(): Promise<void> {
    const res = await authedFetch(`/api/notifications/clear`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao limpar notificações');
    }
  },
  async getAdminDashboardStats(): Promise<AdminDashboardStats> {
    const res = await authedFetch(`/api/admin/dashboard`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar estatísticas do admin');
    }
    return res.json();
  },
  async getAdminStores(): Promise<Store[]> {
    const res = await authedFetch(`/api/admin/stores`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar lojas');
    }
    return res.json();
  },
  async updateStoreStatus(storeId: number, status: Store['status']): Promise<void> {
    const res = await authedFetch(`/api/admin/stores/${storeId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar status da loja');
    }
  },
  async getAdminSystemSettings(): Promise<Record<string, string>> {
    const res = await authedFetch(`/api/admin/settings`);
    if (!res.ok) {
      await handleApiError(res, 'Falha ao buscar configurações do sistema');
    }
    return res.json();
  },
  async updateAdminSystemSettings(settings: Record<string, string>): Promise<void> {
    const res = await authedFetch('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ settings }),
    });
    if (!res.ok) {
      await handleApiError(res, 'Falha ao atualizar configurações do sistema');
    }
  },
};