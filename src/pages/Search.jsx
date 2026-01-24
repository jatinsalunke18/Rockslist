import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export default function Search() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const q = query(collection(db, "lists"), orderBy("date", "asc"), limit(100));
                const querySnapshot = await getDocs(q);
                const eventsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAllEvents(eventsList);
            } catch (err) {
                console.error("Error fetching events:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const filteredEvents = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return allEvents.filter(event => {
            const name = (event.name || event.eventName || '').toLowerCase();
            const city = (event.city || '').toLowerCase();
            const location = (event.location || '').toLowerCase();
            const date = (event.date || '').toLowerCase();
            return name.includes(term) || city.includes(term) || location.includes(term) || date.includes(term);
        });
    }, [searchTerm, allEvents]);

    const formatDate = (dateString) => {
        if (!dateString) return { day: '?', month: '???' };
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { day: '?', month: '???' };
        return {
            day: date.getDate(),
            month: date.toLocaleString('default', { month: 'short' })
        };
    };

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <span className="logo-text-medium">Search</span>
                </div>
            </header>

            <div className="screen-content" style={{ paddingBottom: 100 }}>
                <div className="search-input-container" style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                    <div className="search-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <i className="fas fa-search" style={{ position: 'absolute', left: 16, color: 'var(--text-muted)', fontSize: 16 }}></i>
                        <input
                            type="text"
                            placeholder="Search events, venues, cities..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '12px 40px 12px 44px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: 15, outline: 'none', background: 'var(--background)' }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                                <i className="fas fa-times-circle" style={{ fontSize: 18 }}></i>
                            </button>
                        )}
                    </div>
                </div>

                <div className="search-results" style={{ padding: '16px 24px' }}>
                    {loading ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading events...</p>
                    ) : !searchTerm.trim() ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
                            <i className="fas fa-search" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 15 }}>Search for events by name, venue, or city</p>
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
                            <i className="fas fa-calendar-times" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 15 }}>No events found</p>
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Try a different search term</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 600 }}>
                                {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
                            </p>
                            <div className="events-list">
                                {filteredEvents.map(event => {
                                    const { day, month } = formatDate(event.date);
                                    return (
                                        <div key={event.id} className="horizontal-event-card" onClick={() => navigate(`/event/${event.id}`)} style={{ cursor: 'pointer' }}>
                                            <div className="h-card-img-wrapper">
                                                <img src={event.flyerUrl || "https://placehold.co/200x200/EEE/31343C?text=Event"} alt={event.name} className="h-card-img" />
                                            </div>
                                            <div className="h-card-info">
                                                <div className="h-card-date">{month} {day}</div>
                                                <div className="h-card-title">{event.eventName || event.name || 'Unnamed Event'}</div>
                                                <div className="h-card-meta">
                                                    <i className="fas fa-map-marker-alt"></i> {event.location}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
