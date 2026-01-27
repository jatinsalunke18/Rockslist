import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, limit } from 'firebase/firestore';

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
                // Update local state
                setNotifications(prev => 
                    prev.map(n => n.id === notif.id ? { ...n, read: true } : n)
                );
            }
            if (notif.eventId) {
                navigate(`/event/${notif.eventId}`);
            }
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
            // Still navigate even if marking as read fails
            if (notif.eventId) {
                navigate(`/event/${notif.eventId}`);
            }
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'RSVP_CONFIRMED': return <i className="fas fa-check-circle" style={{ color: 'var(--success)' }}></i>;
            case 'RSVP_EDITED': return <i className="fas fa-edit" style={{ color: 'var(--primary)' }}></i>;
            case 'RSVP_REMOVED': return <i className="fas fa-times-circle" style={{ color: 'var(--error)' }}></i>;
            case 'EVENT_ADDED': return <i className="fas fa-calendar-plus" style={{ color: 'var(--primary)' }}></i>;
            case 'rsvp_confirmation': return <i className="fas fa-check-circle" style={{ color: 'var(--success)' }}></i>;
            case 'new_guest': return <i className="fas fa-user-plus" style={{ color: 'var(--primary)' }}></i>;
            default: return <i className="fas fa-bell" style={{ color: 'var(--text-muted)' }}></i>;
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
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">Notifications</span>
                </div>
                <div className="header-right"></div>
            </header>

            <div className="screen-content" style={{ padding: '16px 24px 100px' }}>
                {loading ? (
                    <div className="center-msg">Loading...</div>
                ) : notifications.length === 0 && !error ? (
                    <div className="empty-state">
                        <i className="fas fa-bell-slash" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                        <h3>No notifications yet</h3>
                        <p>You'll see updates about your RSVPs here</p>
                    </div>
                ) : error ? (
                    <div className="empty-state">
                        <i className="fas fa-exclamation-circle" style={{ fontSize: 48, color: 'var(--error)' }}></i>
                        <h3>Unable to load</h3>
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {notifications.map(notif => (
                            <div
                                key={notif.id}
                                className={`notification-card ${!notif.read ? 'unread' : ''}`}
                                onClick={() => handleNotificationClick(notif)}
                            >
                                <div className="notif-icon">
                                    {getIcon(notif.type)}
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
