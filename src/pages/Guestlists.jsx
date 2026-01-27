import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, collectionGroup, getDocs, documentId } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Guestlists() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cache, setCache] = useState({ all: null, rsvps: null, created: null });
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        // Cleanup previous listener
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        // Show cached data immediately if available
        if (cache[activeTab]) {
            setLists(cache[activeTab]);
            setLoading(false);
        } else {
            setLoading(true);
        }

        const fetchLists = async () => {
            try {
                if (activeTab === 'rsvps' && user) {
                    // FALLBACK STRATEGY FOR RSVPS:
                    // 1. Try Optimized Query (joinedUserIds) - Realtime
                    // 2. If filtering empty/fails, use Collection Group Query (Legacy Support)

                    // Note: Ideally we want realtime, but Collection Group + Parent Fetch is hard to do realtime efficiently without Denormalization.
                    // For now, we will use the legacy robust method: Collection Group Query (One-time fetch for stability)

                    // Step 1: Find all RSVPs by this user across all events
                    const rsvpsQuery = query(collectionGroup(db, 'rsvps'), where('userId', '==', user.uid));
                    const rsvpsSnapshot = await getDocs(rsvpsQuery);

                    if (rsvpsSnapshot.empty) {
                        setLists([]);
                        setLoading(false);
                        return;
                    }

                    // Step 2: Extract unique Event IDs
                    const eventIds = [...new Set(rsvpsSnapshot.docs.map(doc => doc.ref.parent.parent.id))].slice(0, 10); // Limit to 10 for safety

                    if (eventIds.length === 0) {
                        setLists([]);
                        setLoading(false);
                        return;
                    }

                    // Step 3: Fetch those events
                    // Use 'in' query for events (max 10 per batch)
                    const eventsQuery = query(collection(db, 'lists'), where(documentId(), 'in', eventIds));

                    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
                        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setLists(data);
                        setCache(prev => ({ ...prev, [activeTab]: data }));
                        setLoading(false);
                    });

                    unsubscribeRef.current = unsubscribe;
                    return;
                }

                let q;
                if (activeTab === 'all') {
                    // REMOVED 'live' filter to show potentially legacy events
                    q = query(
                        collection(db, 'lists'),
                        orderBy('date', 'asc'),
                        limit(50)
                    );
                } else if (activeTab === 'created' && user) {
                    q = query(
                        collection(db, 'lists'),
                        where('createdBy', '==', user.uid),
                        orderBy('date', 'desc')
                    );
                }

                if (!q) {
                    setLoading(false);
                    return;
                }

                unsubscribeRef.current = onSnapshot(
                    q,
                    (snapshot) => {
                        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        setLists(data);
                        setCache(prev => ({ ...prev, [activeTab]: data }));
                        setLoading(false);
                    },
                    (error) => {
                        console.error('Lists query error:', error);
                        // Fallback: If orderBy date fails (missing index), try without sort
                        if (error.code === 'failed-precondition' || error.message.includes('index')) {
                            console.warn('Index missing, falling back to simple query');
                            if (activeTab === 'all') {
                                const fallbackQ = query(collection(db, 'lists'), limit(20));
                                getDocs(fallbackQ).then(snap => {
                                    setLists(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                                    setLoading(false);
                                });
                            }
                        } else {
                            setLoading(false);
                        }
                    }
                );

            } catch (err) {
                console.error("Error setting up listeners:", err);

                // Fallback for My Lists if index is missing
                if (activeTab === 'created') {
                    console.warn('Falling back to client-side filter for My Lists');
                    const fallbackQ = query(collection(db, 'lists'), orderBy('date', 'desc'), limit(50));
                    getDocs(fallbackQ).then(snap => {
                        const userEvents = snap.docs
                            .map(d => ({ id: d.id, ...d.data() }))
                            .filter(event => event.createdBy === user?.uid);
                        setLists(userEvents);
                        setLoading(false);
                    });
                } else {
                    setLoading(false);
                }
            }
        };

        fetchLists();

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
    }, [activeTab, user]);

    const getEventBadge = (event) => {
        if (activeTab === 'rsvps') return { text: 'Joined', color: 'var(--success)' };
        if (user && event.createdBy === user.uid) return { text: 'Hosting', color: 'var(--primary)' };
        // Check both optimized array AND legacy RSVP check if possible (client side only here)
        if (event.joinedUserIds?.includes(user?.uid)) return { text: 'Joined', color: 'var(--success)' };
        return { text: 'Upcoming', color: 'var(--text-muted)' };
    };

    const getEventInitials = (name) => {
        return name?.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase() || 'EV';
    };

    const renderSkeleton = () => (
        <div className="events-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="event-card-modern skeleton">
                    <div className="event-card-image skeleton-box"></div>
                    <div className="event-card-content">
                        <div className="skeleton-text"></div>
                        <div className="skeleton-text short"></div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderEventCard = (event) => {
        const badge = getEventBadge(event);
        const initials = getEventInitials(event.eventName || event.name);
        const attendees = event.attendeesCount || 0;
        const capacity = event.maxAttendees || 0;

        return (
            <div key={event.id} className="event-card-modern" onClick={() => navigate(`/event/${event.id}`)}>
                <div className="event-card-image">
                    {event.flyerUrl ? (
                        <img src={event.flyerUrl} alt={event.eventName || event.name} loading="lazy" />
                    ) : (
                        <div className="event-card-placeholder" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-image" style={{ color: 'white', opacity: 0.4, fontSize: '2rem' }}></i>
                        </div>
                    )}
                    <div className="event-card-badge" style={{ backgroundColor: badge.color }}>
                        {badge.text}
                    </div>
                </div>
                <div className="event-card-content">
                    <h3 className="event-card-title">{event.eventName || event.name}</h3>
                    <div className="event-card-meta">
                        <div className="event-meta-item">
                            <i className="fas fa-calendar-alt"></i>
                            <span>{event.date}</span>
                        </div>
                        <div className="event-meta-item">
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{event.location}</span>
                        </div>
                        {capacity > 0 && (
                            <div className="event-meta-item">
                                <i className="fas fa-users"></i>
                                <span>{attendees}/{capacity}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (loading && !cache[activeTab]) return renderSkeleton();

        if (lists.length === 0) {
            if (activeTab === 'all') {
                return (
                    <div className="empty-state">
                        <i className="fas fa-calendar-plus" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                        <h3>No events found</h3>
                        <p>Check back later for upcoming events</p>
                    </div>
                );
            }
            if (activeTab === 'rsvps') {
                return (
                    <div className="empty-state">
                        <i className="fas fa-ticket-alt" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                        <h3>No RSVPs yet</h3>
                        <p>Join some events to see them here</p>
                        <button className="primary-btn" onClick={() => setActiveTab('all')} style={{ marginTop: 16 }}>
                            Explore Events
                        </button>
                    </div>
                );
            }
            if (activeTab === 'created') {
                return (
                    <div className="empty-state">
                        <i className="fas fa-plus-circle" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                        <h3>No guestlists created</h3>
                        <p>Create your first event guestlist</p>
                        <button className="primary-btn" onClick={() => navigate('/create')} style={{ marginTop: 16 }}>
                            Create Guestlist
                        </button>
                    </div>
                );
            }
        }

        return (
            <>
                {activeTab === 'created' && (
                    <div className="padding-x">
                        <button className="primary-btn-outline full-width-btn margin-v" onClick={() => navigate('/create')}>
                            <i className="fas fa-plus"></i> Create a guestlist
                        </button>
                    </div>
                )}
                <div className="events-grid">
                    {lists.map(renderEventCard)}
                </div>
            </>
        );
    };

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <span className="logo-text-medium">Guestlists</span>
                </div>
                <div className="header-right">
                    <div className="profile-icon-header" onClick={() => navigate('/profile')}>
                        <i className="fas fa-user-circle"></i>
                    </div>
                </div>
            </header>

            <div className="tabs-container">
                <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All Lists</button>
                <button className={`tab-btn ${activeTab === 'rsvps' ? 'active' : ''}`} onClick={() => setActiveTab('rsvps')}>RSVP</button>
                <button className={`tab-btn ${activeTab === 'created' ? 'active' : ''}`} onClick={() => setActiveTab('created')}>My Lists</button>
            </div>

            <div className="screen-content">
                {renderContent()}
            </div>
        </section>
    );
}
