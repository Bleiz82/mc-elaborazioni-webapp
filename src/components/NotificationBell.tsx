import React, { useState, useEffect, useRef } from 'react';
import { Bell, CalendarClock, CreditCard, FileText, Kanban, MessageSquare, Bot, Check } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'scadenza' | 'pagamento' | 'documento' | 'pratica' | 'comunicazione' | 'sistema' | string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // We use user.uid for clients, and 'admin' for admins (or their uid if we track admin specifically)
    // For simplicity, we assume the user.uid is used, and for admin we might have a specific logic.
    // Let's assume notifications are targeted to user.uid or 'admin' if user is admin.
    // We'll just query by user.uid for now. In a real app, admin might subscribe to 'admin' notifications too.
    
    // We'll query where userId == user.uid OR userId == 'admin' if user is admin.
    // To keep it simple and within Firestore limits without complex indexes, we'll just query by user.uid.
    // If the user is an admin, they should also get 'admin' notifications. We can do two queries or just one if we set it up right.
    // Let's assume the app sets user_id in notifications.
    
    // Wait, the prompt says: query: notifications dove userId == currentUser E isRead == false
    // But it also says we might have 'admin' as userId. Let's just query by user.uid.
    
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({
          id: doc.id,
          title: data.title,
          message: data.message,
          type: data.type,
          isRead: data.is_read || data.isRead || false,
          createdAt: data.created_at || data.createdAt,
          link: data.link
        });
      });
      setNotifications(notifs);
    }, (error) => {
      console.error("Error fetching notifications:", error);
    });

    return () => unsubscribe();
  }, [user]);

  // Also fetch 'admin' notifications if user is admin
  useEffect(() => {
    if (!user) return;
    
    // Check if user is admin (you might have a better way to check this)
    // For now, we'll just run a separate listener for 'admin' if the user's email is the admin email.
    // Actually, let's just listen to 'admin' notifications if the URL contains '/admin'
    if (!window.location.pathname.startsWith('/admin')) return;

    const qAdmin = query(
      collection(db, 'notifications'),
      where('user_id', '==', 'admin'),
      orderBy('created_at', 'desc'),
      limit(20)
    );

    const unsubscribeAdmin = onSnapshot(qAdmin, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({
          id: doc.id,
          title: data.title,
          message: data.message,
          type: data.type,
          isRead: data.is_read || data.isRead || false,
          createdAt: data.created_at || data.createdAt,
          link: data.link
        });
      });
      
      setNotifications(prev => {
        const combined = [...prev.filter(n => !notifs.find(an => an.id === n.id)), ...notifs];
        return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20);
      });
    });

    return () => unsubscribeAdmin();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { is_read: true, isRead: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead);
    for (const n of unreadNotifs) {
      await handleMarkAsRead(n.id);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'scadenza': return <CalendarClock className="w-5 h-5 text-amber-500" />;
      case 'pagamento':
      case 'payment': return <CreditCard className="w-5 h-5 text-emerald-500" />;
      case 'documento': return <FileText className="w-5 h-5 text-sky-500" />;
      case 'pratica': return <Kanban className="w-5 h-5 text-purple-500" />;
      case 'comunicazione': return <MessageSquare className="w-5 h-5 text-teal-500" />;
      default: return <Bot className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">Notifiche</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Segna tutte come lette
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm">Nessuna notifica</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {notifications.map(notification => (
                  <div 
                    key={notification.id}
                    onClick={() => {
                      if (!notification.isRead) handleMarkAsRead(notification.id);
                    }}
                    className={clsx(
                      "p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer flex gap-3",
                      !notification.isRead ? "bg-sky-50/50 dark:bg-sky-900/20" : ""
                    )}
                  >
                    <div className="mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        "text-sm mb-0.5",
                        !notification.isRead ? "font-bold text-slate-900 dark:text-slate-100" : "font-medium text-slate-700 dark:text-slate-300"
                      )}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: it })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
