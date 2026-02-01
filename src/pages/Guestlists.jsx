import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, collectionGroup, getDocs, documentId } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import EventCard from '../components/EventCard';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Guestlists() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [lists, setLists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cache, setCache] = useState({ all: null, rsvps: null, created: null });
    const unsubscribeRef = useRef(null);

    useEffect(() => {
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        if (cache[activeTab]) {
            setLists(cache[activeTab]);
            setLoading(false);
        } else {
            setLoading(true);
        }

        const fetchLists = async () => {
            try {
                if (activeTab === 'rsvps' && user) {
                    const rsvpsQuery = query(collectionGroup(db, 'rsvps'), where('userId', '==', user.uid));
                    const rsvpsSnapshot = await getDocs(rsvpsQuery);

                    if (rsvpsSnapshot.empty) {
                        setLists([]);
                        setLoading(false);
                        return;
                    }

                    const eventIds = [...new Set(rsvpsSnapshot.docs.map(doc => doc.ref.parent.parent.id))].slice(0, 10);

                    if (eventIds.length === 0) {
                        setLists([]);
                        setLoading(false);
                        return;
                    }

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
                        if (error.code === 'failed-precondition' || error.message.includes('index')) {
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

                if (activeTab === 'created') {
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
        if (event.joinedUserIds?.includes(user?.uid)) return { text: 'Joined', color: 'var(--success)' };
        return { text: 'Upcoming', color: 'var(--text-muted)' };
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

    const renderContent = () => {
        if (loading && !cache[activeTab]) return renderSkeleton();

        if (lists.length === 0) {
            if (activeTab === 'all') {
                return (
                    <EmptyState
                        icon="fa-calendar-plus"
                        title="No events found"
                        description="Check back later for upcoming events"
                    />
                );
            }
            if (activeTab === 'rsvps') {
                return (
                    <EmptyState
                        icon="fa-ticket-alt"
                        title="No RSVPs yet"
                        description="Join some events to see them here"
                    >
                        <button className="primary-btn" onClick={() => setActiveTab('all')} style={{ marginTop: 16 }}>
                            Explore Events
                        </button>
                    </EmptyState>
                );
            }
            if (activeTab === 'created') {
                return (
                    <EmptyState
                        icon="fa-plus-circle"
                        title="No guestlists created"
                        description="Create your first event guestlist"
                    >
                        <button className="primary-btn" onClick={() => navigate('/create')} style={{ marginTop: 16 }}>
                            Create Guestlist
                        </button>
                    </EmptyState>
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
                    {lists.map(event => (
                        <EventCard
                            key={event.id}
                            event={event}
                            variant="modern"
                            badge={getEventBadge(event)}
                            onClick={() => navigate(`/event/${event.id}`)}
                        />
                    ))}
                </div>
            </>
        );
    };

    return (
        <section className="screen active">
            <Header
                title="Guestlists"
                right={
                    <div className="profile-icon-header" onClick={() => navigate('/profile')}>
                        <i className="fas fa-user-circle"></i>
                    </div>
                }
            />

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
