export type Role = 'ADMIN' | 'MANAGER' | 'COLLABORATOR';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  commission_rate: number;
  store_id: number;
  store_code: string;
  store_plan?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  break_start_time?: string | null;
  break_end_time?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Service {
  id: number;
  name: string;
  price: number;
  duration_minutes: number;
  category?: string;
}

export interface Appointment {
  id: number;
  client_id: number;
  client_name?: string;
  professional_id: number;
  professional_name?: string;
  service_id: number;
  service_name?: string;
  service_price?: number;
  store_id: number;
  store_name?: string;
  start_time: string;
  end_time: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  review_id?: number | null;
  review_rating?: number | null;
}

export interface Store {
  id: number;
  name: string;
  code: string;
  plan?: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  status?: 'PENDING_PAYMENT' | 'ACTIVE' | 'INACTIVE';
  is_favorite?: 0 | 1;
  manager_name?: string;
  manager_email?: string;
}

export interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  cep: string;
  birth_date?: string | null;
  password?: string; // Password is not always present on the client-side
}

export interface CommissionStats {
  daily: number;
  weekly: number;
  monthly: number;
  rate: number;
  monthly_revenue?: number;
  monthly_goal?: number;
  recent_expenses?: Expense[];
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
  store_id: number;
  user_id?: number | null;
}

export interface Product {
  id: number;
  name: string;
  stock_quantity: number;
  price: number;
}

export interface DashboardStats {
  revenue: number;
  netProfit: number;
  totalCommissions: number;
  extraCosts: number;
  stockCost: number; // Total inventory value
  appointments: number;
  lowStock: number;
  monthlyGoal: number;
}

export interface StaffFinancialStats {
  id: number;
  name: string;
  totalRevenue: number;
  totalCommission: number;
}

export interface AdminDashboardStats {
  mrr: number;
  activeStores: number;
  pendingStores: number;
}

export interface Notification {
  id: number;
  user_id: number | null;
  store_id: number;
  title: string;
  message: string;
  type: 'APPOINTMENT_REMINDER' | 'SYSTEM' | 'INVENTORY';
  is_read: number;
  created_at: string;
}

export interface MonthlySpending {
  month: string; // "YYYY-MM"
  completedTotal: number;
  upcomingTotal: number;
  appointments: {
    service_name: string;
    service_price: number;
    start_time: string;
    status: 'PENDING' | 'COMPLETED';
  }[];
}

export interface ClientSpendingStats {
  historicalTotal: number;
  upcomingTotal: number;
  monthlyBreakdown: MonthlySpending[];
}
