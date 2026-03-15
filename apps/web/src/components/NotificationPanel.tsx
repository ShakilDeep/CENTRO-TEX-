import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';
import type { Notification } from '../api/notifications';
import { formatDistanceToNow } from 'date-fns';

const NotificationPanel = () => {
    const [isOpen, setIsOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();

    // Fetch notifications
    const { data: notificationsData, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: notificationsApi.list,
        refetchInterval: 30000, // Poll every 30s
        enabled: isOpen, // Only fetch when open to save bandwidth, or can just refetch on open
    });

    // Fetch unread count even when closed
    const { data: unreadCountData } = useQuery({
        queryKey: ['notifications-unread-count'],
        queryFn: notificationsApi.getUnreadCount,
        refetchInterval: 30000,
    });

    const markAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
        }
    });

    const handleOutsideClick = useCallback((e: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [isOpen, handleOutsideClick, queryClient]);

    const notifications = notificationsData?.data || [];
    const unreadCount = unreadCountData?.data?.count || 0;

    return (
        <div ref={panelRef} className="relative">
            <button
                id="notification-bell-btn"
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((prev) => !prev)}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full outline outline-2 outline-white" />
                )}
            </button>

            {isOpen && (
                <div
                    role="dialog"
                    aria-label="Notifications panel"
                    className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ maxHeight: '480px' }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base text-slate-600">notifications</span>
                            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="px-2 py-0.5 ml-1 text-xs font-medium text-white bg-blue-500 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => markAllAsReadMutation.mutate()}
                                disabled={markAllAsReadMutation.isPending}
                                className="text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                        {isLoading ? (
                            <div className="flex justify-center py-10">
                                <span className="material-symbols-outlined animate-spin text-slate-300">progress_activity</span>
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="flex flex-col">
                                {notifications.map((notif: Notification) => (
                                    <div
                                        key={notif.id}
                                        className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer ${notif.is_read ? 'opacity-70' : 'bg-blue-50/30'}`}
                                        onClick={() => {
                                            if (!notif.is_read) {
                                                markAsReadMutation.mutate(notif.id);
                                            }
                                        }}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h4 className={`text-sm ${notif.is_read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                                                    {notif.title}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                                <span className="text-[10px] text-slate-400 mt-1 block">
                                                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            {!notif.is_read && (
                                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 gap-2">
                                <span className="material-symbols-outlined text-3xl text-slate-200">notifications_off</span>
                                <p className="text-sm text-slate-400">No notifications yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
