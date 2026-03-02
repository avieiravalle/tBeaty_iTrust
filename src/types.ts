export type Role = 'ADMIN' | 'MANAGER' | 'COLLABORATOR';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  commission_rate: number;
  store_id: number;
  store_code: string;
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
}

export interface Store {
  id: number;
  name: string;
  code: string;
}

export interface Client {
  id: number;
  name: string;
  phone: string;
  cep: string;
}

export interface CommissionStats {
  daily: number;
  weekly: number;
  monthly: number;
  rate: number;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
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
