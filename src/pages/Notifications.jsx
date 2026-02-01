import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';
import Header from '../components/Header';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Notifications() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const q = query(
            collection(db, "notifications"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(notif => notif.userId === user.uid);
                setNotifications(list);
                setLoading(false);
            },
            (err) => {
                console.error('Notifications listener error:', err);
                setError('Failed to load notifications');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    const handleNotificationClick = async (notif) => {
        try {
            if (!notif.read) {
                await updateDoc(doc(db, "notifications", notif.id), { read: true });
                setNotifications(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                );
            }
            if (notif.eventId) {
                navigate(`/event/${notif.eventId}`);
            }
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            if (notif.eventId) {
                navigate(`/event/${notif.eventId}`);
            }
        }
    };

    const getIconClass = (type) => {
        switch (type) {
            case 'RSVP_CONFIRMED': return 'fa-check-circle';
            case 'RSVP_EDITED': return 'fa-edit';
            case 'RSVP_REMOVED': return 'fa-times-circle';
            case 'EVENT_ADDED': return 'fa-calendar-plus';
            case 'rsvp_confirmation': return 'fa-check-circle';
            case 'new_guest': return 'fa-user-plus';
            default: return 'fa-bell';
        }
    };

    const getIconColor = (type) => {
        switch (type) {
            case 'RSVP_CONFIRMED': return 'var(--success)';
            case 'RSVP_EDITED': return 'var(--primary)';
            case 'RSVP_REMOVED': return 'var(--error)';
            case 'EVENT_ADDED': return 'var(--primary)';
            case 'rsvp_confirmation': return 'var(--success)';
            case 'new_guest': return 'var(--primary)';
            default: return 'var(--text-muted)';
        }
    };

    const getRelativeTime = (timestamp) => {
        if (!timestamp?.toDate) return 'Just now';
        const date = timestamp.toDate();
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <section className="screen active">
            <Header showBack={true} title="Notifications" />

            <div className="screen-content" style={{ padding: '16px 24px 100px' }}>
                {loading ? (
                    <LoadingSpinner />
                ) : notifications.length === 0 && !error ? (
                    <EmptyState
                        icon="fa-bell-slash"
                        title="No notifications yet"
                        description="You'll see updates about your RSVPs here"
                    />
                ) : error ? (
                    <EmptyState
                        icon="fa-exclamation-circle"
                        title="Unable to load"
                        description={error}
                    />
                ) : (
                    <div className="notifications-list">
                        {notifications.map(notif => (
                            <div
                                key={notif.id}
                                className={`notification-card ${!notif.read ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notif)}
                            >
                                <div className="notif-icon">
                                    <i className={`fas ${getIconClass(notif.type)}`} style={{ color: getIconColor(notif.type) }}></i>
                                </div>
                                <div className="notif-content">
                                    <div className="notif-header">
                                        <h4>{notif.title}</h4>
                                        {!notif.read && <span className="unread-dot"></span>}
                                    </div>
                                    <p className="notif-message">{notif.message}</p>
                                    <span className="notif-time">{getRelativeTime(notif.createdAt)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
