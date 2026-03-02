import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell } from 'lucide-react';
import { api } from './services/api.ts';
import { Notification, User } from './types.ts';

interface NotificationCenterProps {
  user: User;
}

export const NotificationCenter = ({ user }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      try {
        const data = await api.getNotifications(user.id, user.store_id);
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [user]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  const handleMarkRead = useCallback(async (id: number) => {
    await api.markNotificationRead(id);
    setNotifications(currentNotifications =>
      currentNotifications.map(n => (n.id === id ? { ...n, is_read: 1 } : n))
    );
  }, []);

  const handleClear = useCallback(async () => {
    await api.clearNotifications(user.id, user.store_id);
    setNotifications([]);
  }, [user.id, user.store_id]);

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 rounded-2xl bg-white border border-zinc-100 text-zinc-500 hover:text-black hover:bg-zinc-50 transition-all shadow-sm"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-zinc-100 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-50 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-sm">Notificações</h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={handleClear}
                    className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold hover:text-rose-500 transition-colors"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Bell size={20} className="text-zinc-300" />
                    </div>
                    <p className="text-sm text-zinc-400">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <button 
                      key={n.id} 
                      onClick={() => handleMarkRead(n.id)}
                      className={`w-full text-left p-4 border-b border-zinc-50 last:border-0 cursor-pointer transition-colors ${!n.is_read ? 'bg-indigo-50/30' : 'hover:bg-zinc-50'}`}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!n.is_read ? 'bg-indigo-500' : 'bg-transparent'}`} />
                        <div>
                          <p className={`text-sm font-bold ${!n.is_read ? 'text-black' : 'text-zinc-600'}`}>{n.title}</p>
                          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-zinc-400 mt-2 font-medium">
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};