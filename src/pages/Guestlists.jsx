import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function Guestlists() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('all');
    const [createdLists, setCreatedLists] = useState([]);
    const [rsvpLists, setRsvpLists] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchLists = async () => {
            setLoading(true);
            try {
                // 1. Fetch Created Lists
                if (user) {
                    const q = query(collection(db, "lists"), where("createdBy", "==", user.uid));
                    const querySnapshot = await getDocs(q);
                    const created = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCreatedLists(created);
                }

                // 2. Fetch RSVPs (from LocalStorage tracking for now, as per original app logic)
                const userRsvpsIds = JSON.parse(localStorage.getItem('userRsvps') || '[]');
                if (userRsvpsIds.length > 0) {
                    const rsvpPromises = userRsvpsIds.map(id => getDoc(doc(db, "lists", id)));
                    const rsvpSnapshots = await Promise.all(rsvpPromises);
                    const rsvps = rsvpSnapshots
                        .filter(snap => snap.exists())
                        .map(snap => ({ id: snap.id, ...snap.data() }));
                    setRsvpLists(rsvps);
                }
            } catch (err) {
                console.error("Error fetching lists:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchLists();
    }, [user]);

    const renderEventList = (events) => {
        if (loading) return <div style={{ padding: 20, textAlign: 'center' }}>Loading...</div>;
        if (events.length === 0) {
            return (
                <div className="empty-state">
                    <i className="fas fa-list-ul"></i>
                    <p>No lists found.</p>
                </div>
            );
        }
        return (
            <div className="lists-grid">
                {events.map(event => (
                    <div key={event.id} className="horizontal-event-card" onClick={() => navigate(`/event/${event.id}`)}>
                        <div className="h-card-img-wrapper">
                            <img src={event.flyerUrl || "https://via.placeholder.com/200"} className="h-card-img" alt={event.eventName} />
                        </div>
                        <div className="h-card-info">
                            <div className="h-card-date">{event.date}</div>
                            <div className="h-card-title">{event.eventName || event.name}</div>
                            <div className="h-card-meta">
                                <i className="fas fa-map-marker-alt"></i> {event.location}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
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
                {activeTab === 'created' && (
                    <div className="padding-x">
                        <button className="primary-btn-outline full-width-btn margin-v" onClick={() => navigate('/create')}>
                            <i className="fas fa-plus"></i> Create a guestlist
                        </button>
                    </div>
                )}

                {activeTab === 'all' && renderEventList([...createdLists, ...rsvpLists].filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i))}
                {activeTab === 'rsvps' && renderEventList(rsvpLists)}
                {activeTab === 'created' && renderEventList(createdLists)}
            </div>
        </section>
    );
}
