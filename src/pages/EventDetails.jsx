import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function EventDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendeesCount, setAttendeesCount] = useState(0);
    const [hasJoined, setHasJoined] = useState(false);
    const [userRsvpId, setUserRsvpId] = useState(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [showActionSheet, setShowActionSheet] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const docRef = doc(db, "lists", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEvent({ id: docSnap.id, ...docSnap.data() });
                }
            } catch (err) {
                console.error("Error getting document:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (!id || !user) return;
        const rsvpsRef = collection(db, `lists/${id}/rsvps`);
        const unsubscribe = onSnapshot(rsvpsRef, (snapshot) => {
            let total = 0;
            let userHasRsvp = false;
            let rsvpDocId = null;
            
            const userEmail = user.email?.toLowerCase().trim();
            const userPhone = user.phoneNumber?.replace(/[^0-9]/g, '');
            
            snapshot.docs.forEach(docSnap => {
                const data = docSnap.data();
                if (data.guests && Array.isArray(data.guests)) {
                    total += data.guests.length;
                    
                    // Check if user created this RSVP
                    if (data.userId === user.uid) {
                        userHasRsvp = true;
                        rsvpDocId = docSnap.id;
                    }
                    
                    // Check if user is in guest list (identity-based matching)
                    if (!userHasRsvp) {
                        const matchedGuest = data.guests.find(guest => {
                            // Match by email (highest priority)
                            if (userEmail && guest.email) {
                                if (guest.email.toLowerCase().trim() === userEmail) {
                                    return true;
                                }
                            }
                            // Match by linkedUid
                            if (guest.linkedUid && guest.linkedUid === user.uid) {
                                return true;
                            }
                            // Match by phone (fallback)
                            if (userPhone && guest.phone) {
                                const guestPhone = guest.phone.replace(/[^0-9]/g, '');
                                if (guestPhone === userPhone) {
                                    return true;
                                }
                            }
                            return false;
                        });
                        
                        if (matchedGuest) {
                            userHasRsvp = true;
                            rsvpDocId = docSnap.id;
                        }
                    }
                }
            });
            
            setAttendeesCount(total);
            setHasJoined(userHasRsvp);
            setUserRsvpId(rsvpDocId);
        });
        return () => unsubscribe();
    }, [id, user]);

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: event?.eventName || event?.name,
                    text: `Check out ${event?.eventName || event?.name} on Rockslist!`,
                    url: window.location.href
                });
            } catch (err) {
                console.error('Share cancelled or failed', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const handleExitGuestlist = async () => {
        if (!userRsvpId) return;
        setExiting(true);
        try {
            const { deleteDoc, doc: docRef, updateDoc, increment, getDoc: getDocSnapshot } = await import('firebase/firestore');
            const rsvpRef = docRef(db, `lists/${id}/rsvps`, userRsvpId);
            const rsvpSnap = await getDocSnapshot(rsvpRef);
            
            if (rsvpSnap.exists()) {
                const data = rsvpSnap.data();
                const guestCount = data.guests?.length || 0;
                
                await deleteDoc(rsvpRef);
                
                const eventRef = docRef(db, 'lists', id);
                await updateDoc(eventRef, {
                    attendeesCount: increment(-guestCount)
                });
                
                const userRsvps = JSON.parse(localStorage.getItem('userRsvps') || '[]');
                const updatedRsvps = userRsvps.filter(rsvpId => rsvpId !== id);
                localStorage.setItem('userRsvps', JSON.stringify(updatedRsvps));
            }
            
            setShowExitModal(false);
            setShowActionSheet(false);
        } catch (err) {
            console.error('Exit guestlist failed:', err);
            alert('Failed to exit guestlist');
        } finally {
            setExiting(false);
        }
    };

    if (loading) return <div className="screen center-msg">Loading...</div>;
    if (!event) return <div className="screen center-msg">Event not found</div>;

    const isCreator = user && event.createdBy === user.uid;
    const maxAttendees = parseInt(event.maxAttendees) || 100;
    const capacityPercent = Math.min((attendeesCount / maxAttendees) * 100, 100);

    return (
        <section className="screen active">
            <header className="event-details-header">
                <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                <div className="header-actions" style={{ display: 'flex', gap: 12 }}>
                    <button className="icon-btn-plain" onClick={handleShare}><i className="fas fa-share-alt"></i></button>
                    <button className="icon-btn-plain"><i className="fas fa-ellipsis-v"></i></button>
                </div>
            </header>

            <div className="event-details-scroll">
                <div className="event-flyer-section">
                    <img src={event.flyerUrl || "https://via.placeholder.com/400x500"} alt="Event Flyer" className="event-flyer-img" />
                </div>

                <div className="event-info-section">
                    <h1 className="event-title">{event.eventName || event.name}</h1>
                    
                    <div className="event-meta-row">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{event.location}</span>
                    </div>
                    <div className="event-meta-row">
                        <i className="fas fa-calendar-alt"></i>
                        <span>{event.date} • {event.time}</span>
                    </div>

                    <div className="event-info-card">
                        <div className="info-card-row">
                            <div className="info-item">
                                <span className="info-label">Lists for</span>
                                <span className="info-value">{event.entryType?.join(', ') || 'Everyone'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Closes at</span>
                                <span className="info-value">{event.closeTime}</span>
                            </div>
                        </div>
                        <div className="capacity-section">
                            <div className="capacity-header">
                                <span className="capacity-label">Capacity</span>
                                <span className="capacity-count">{attendeesCount} / {maxAttendees}</span>
                            </div>
                            <div className="capacity-bar">
                                <div className="capacity-fill" style={{ width: `${capacityPercent}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {event.description && (
                        <div className="event-description">
                            <h3>Description</h3>
                            <p>{event.description}</p>
                        </div>
                    )}

                    {event.perks && (
                        <div className="event-perks">
                            <h3>Perks</h3>
                            <p>{event.perks}</p>
                        </div>
                    )}
                </div>
            </div>

            {hasJoined && !isCreator && (
                <div className="event-bottom-actions">
                    <button className="action-btn-primary" onClick={() => setShowActionSheet(true)} style={{ width: '100%' }}>
                        <i className="fas fa-cog"></i>
                        Manage RSVP
                    </button>
                </div>
            )}

            {!hasJoined && !isCreator && (
                <div className="event-bottom-actions">
                    <button className="action-btn-primary" onClick={() => navigate(`/rsvp/${id}`)} style={{ width: '100%' }}>
                        Join Guestlist
                    </button>
                </div>
            )}

            {isCreator && (
                <div className="event-bottom-actions">
                    <button className="action-btn-primary" onClick={() => navigate(`/manage/${id}`)} style={{ width: '100%' }}>
                        <i className="fas fa-users"></i>
                        Edit Entries
                    </button>
                </div>
            )}

            {showActionSheet && (
                <>
                    <div className="action-sheet-overlay" onClick={() => setShowActionSheet(false)}></div>
                    <div className="action-sheet">
                        <div className="action-sheet-handle"></div>
                        <div className="action-sheet-content">
                            <div className="action-sheet-status">
                                <i className="fas fa-check-circle"></i>
                                <span>RSVP Confirmed</span>
                            </div>
                            <div className="action-sheet-actions">
                                <button className="action-sheet-btn" onClick={() => { setShowActionSheet(false); navigate(`/rsvp/${id}?view=true&rsvpId=${userRsvpId}`); }}>
                                    <i className="fas fa-eye"></i>
                                    <span>View Entry Details</span>
                                </button>
                                <button className="action-sheet-btn" onClick={() => { setShowActionSheet(false); navigate(`/rsvp/${id}?edit=true&rsvpId=${userRsvpId}`); }}>
                                    <i className="fas fa-edit"></i>
                                    <span>Edit Entry</span>
                                </button>
                                <button className="action-sheet-btn action-sheet-btn-danger" onClick={() => { setShowActionSheet(false); setShowExitModal(true); }}>
                                    <i className="fas fa-sign-out-alt"></i>
                                    <span>Exit Guestlist</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {showExitModal && (
                <div className="modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-header">
                            <h3>Exit Guestlist</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to exit this guestlist? This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="secondary-btn" onClick={() => setShowExitModal(false)} disabled={exiting}>Cancel</button>
                            <button className="danger-btn" onClick={handleExitGuestlist} disabled={exiting}>
                                {exiting ? 'Exiting...' : 'Exit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
