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
                            return (
                                <div key={event.id} className="event-card" onClick={() => navigate(`/event/${event.id}`)}>
                                    <div className="event-card-img-wrapper">
                                        <img src={event.flyerUrl || "https://placehold.co/600x400/EEE/31343C?text=Event"} alt={event.name} className="event-card-img" />
                                        <div className="card-overlay-badge">
                                            <span className="month">{month}</span>
                                            <span className="day">{day}</span>
                                        </div>
                                    </div>
                                    <div className="event-card-info">
                                        <h3 className="event-card-title">{event.name || event.eventName || 'Unnamed Event'}</h3>
                                        <div className="event-card-details">
                                            <div className="event-card-loc">
                                                <i className="fas fa-map-marker-alt"></i>
                                                <span>{event.location}</span>
                                            </div>
                                            <div>
                                                {event.entryType?.join(', ')}
                                            </div>
                                        </div>
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
