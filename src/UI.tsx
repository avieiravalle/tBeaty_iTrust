import React from 'react';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
  id: string;
}

export const SidebarItem = ({ icon: Icon, label, active, onClick, id }: SidebarItemProps) => (
  <button
    onClick={onClick}
    id={id}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-black text-white shadow-lg' 
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-black'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = ({ children, className = "" }: CardProps) => (
  <div className={`bg-white border border-zinc-100 rounded-2xl shadow-sm p-6 ${className}`}>
    {children}
  </div>
);

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
}

export const StatCard = ({ label, value, icon: Icon, colorClass }: StatCardProps) => (
  <Card className="flex items-center justify-between">
    <div>
      <p className="text-sm font-medium text-zinc-500 mb-1">{label}</p>
      <h3 className="text-2xl font-bold text-zinc-900">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl ${colorClass}`}>
      <Icon size={24} />
    </div>
  </Card>
);