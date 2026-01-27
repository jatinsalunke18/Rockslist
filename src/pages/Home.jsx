import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const q = query(collection(db, "lists"), orderBy("date", "asc"), limit(50));
                const querySnapshot = await getDocs(q);
                const eventsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setEvents(eventsList);
            } catch (err) {
                console.error("Error fetching events:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return { day: '?', month: '???' };
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { day: '?', month: '???' };
        return {
            day: date.getDate(),
            month: date.toLocaleString('default', { month: 'short' }),
            full: date.toDateString()
        };
    };

    const getEventStatus = (event) => {
        if (!event.closeTime || !event.date) return null;

        const now = new Date();
        const eventDate = new Date(event.date);
        const [hours, minutes] = event.closeTime.split(':');
        const closeDateTime = new Date(eventDate);
        closeDateTime.setHours(parseInt(hours), parseInt(minutes));

        const hoursUntilClose = (closeDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilClose < 0) return { text: 'Closed', color: 'var(--text-muted)' };
        if (hoursUntilClose <= 1) return { text: `Closing soon (${event.closeTime})`, color: '#FF9500' };
        return { text: `Open till ${event.closeTime}`, color: 'var(--text-muted)' };
    };

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <span className="logo-text-medium">Rocks Guestlist</span>
                </div>
                <div className="header-center">
                    <div className="location-pill">
                        <span>City</span>
                        <i className="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div className="header-right">
                    <div className="profile-icon-header" onClick={() => navigate('/profile')}>
                        <i className="fas fa-user-circle"></i>
                    </div>
                </div>
            </header>

            <div className="screen-content">
                <div className="greeting-card glass-card">
                    <h2>hey <span>{user?.displayName || user?.phoneNumber || 'User'}</span>,</h2>
                    <p>you can go for <span className="highlight-count">{events.length}</span> parties today for free in <span>City</span></p>
                </div>

                <div className="section-header" style={{ marginBottom: 16 }}>
                    <h3>Trending Guestlists</h3>
                </div>

                <div className="events-stack-list">
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                    ) : events.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-calendar-times"></i>
                            <p>No upcoming events found.</p>
                        </div>
                    ) : (
                        events.map(event => {
                            const { day, month } = formatDate(event.date);
                            const status = getEventStatus(event);
                            return (
                                <div key={event.id} className="event-card-home" onClick={() => navigate(`/event/${event.id}`)}>
                                    <div className="event-card-img-wrapper">
                                        <img src={event.flyerUrl || "https://placehold.co/600x400/EEE/DDD/png"} alt={event.name} className="event-card-img" loading="lazy" />
                                        <div className="event-card-gradient"></div>
                                        <div className="card-overlay-badge">
                                            <span className="month">{month}</span>
                                            <span className="day">{day}</span>
                                        </div>
                                    </div>
                                    <div className="event-card-info">
                                        <h3 className="event-card-title">{event.name || event.eventName || 'Unnamed Event'}</h3>
                                        <div className="event-card-location">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <span>{event.location}</span>
                                            {status && (
                                                <>
                                                    <span className="event-meta-separator">·</span>
                                                    <span className="event-status-text" style={{ color: status.color }}>{status.text}</span>
                                                </>
                                            )}
                                        </div>
                                        {event.entryType && event.entryType.length > 0 && (
                                            <div className="event-card-chips">
                                                {event.entryType.map((type, idx) => (
                                                    <span key={idx} className="event-chip">{type}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <button className="fab-btn" onClick={() => navigate('/create')}>
                <i className="fas fa-plus"></i>
            </button>
        </section>
    );
}
