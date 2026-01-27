import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { notifyRSVPRemoval, removeUserFromJoinedList } from '../lib/rsvpHelper';

export default function EventDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [attendeesCount, setAttendeesCount] = useState(0);
    const [hasJoined, setHasJoined] = useState(false);
    const [userRsvpId, setUserRsvpId] = useState(null);
    const [hostData, setHostData] = useState(null);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [exiting, setExiting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showRsvpSheet, setShowRsvpSheet] = useState(false);
    const [showEventMenu, setShowEventMenu] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const docRef = doc(db, "lists", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEvent({ id: docSnap.id, ...data });

                    // Fetch host details
                    if (data.createdBy) {
                        const hostRef = doc(db, "users", data.createdBy);
                        const hostSnap = await getDoc(hostRef);
                        if (hostSnap.exists()) {
                            setHostData(hostSnap.data());
                        }
                    }
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
                if (data.guests) {
                    const count = Array.isArray(data.guests) ? data.guests.length : (typeof data.guests === 'object' ? 1 : 0);
                    total += count;

                    if (data.userId === user.uid) {
                        userHasRsvp = true;
                        rsvpDocId = docSnap.id;
                    }

                    if (!userHasRsvp) {
                        const matchedGuest = data.guests.find(guest => {
                            if (userEmail && guest.email) {
                                if (guest.email.toLowerCase().trim() === userEmail) {
                                    return true;
                                }
                            }
                            if (guest.linkedUid && guest.linkedUid === user.uid) {
                                return true;
                            }
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
        setShowEventMenu(false);
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

    const handleEmailOrganizer = () => {
        setShowEventMenu(false);
        if (hostData?.email) {
            window.location.href = `mailto:${hostData.email}`;
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

                // Remove from joinedUserIds
                await removeUserFromJoinedList(id, user.uid);

                // Create notification for exit using helper
                await notifyRSVPRemoval(user.uid, id, event?.eventName || event?.name);
            }

            setShowExitModal(false);
            setShowRsvpSheet(false);
        } catch (err) {
            console.error('Exit guestlist failed:', err);
            alert('Failed to exit guestlist');
        } finally {
            setExiting(false);
        }
    };

    const handleDeleteEvent = async () => {
        setDeleting(true);
        try {
            const { deleteDoc, doc: docRef } = await import('firebase/firestore');
            await deleteDoc(docRef(db, 'lists', id));
            navigate('/');
        } catch (err) {
            console.error('Delete event failed:', err);
            alert('Failed to delete event');
        } finally {
            setDeleting(false);
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
                <div className="header-actions" style={{ display: 'flex', gap: 12, position: 'relative' }}>
                    <button className="icon-btn-plain" onClick={() => setShowEventMenu(!showEventMenu)}>
                        <i className="fas fa-ellipsis-v"></i>
                    </button>

                    {/* Event Menu Dropdown */}
                    {showEventMenu && (
                        <>
                            <div className="dropdown-overlay" onClick={() => setShowEventMenu(false)}></div>
                            <div className="dropdown-menu">
                                <button className="dropdown-item" onClick={handleShare}>
                                    <i className="fas fa-share-alt"></i>
                                    <span>Share Guestlist</span>
                                </button>
                                {hostData?.email && !isCreator && (
                                    <button className="dropdown-item" onClick={handleEmailOrganizer}>
                                        <i className="fas fa-envelope"></i>
                                        <span>Email Organizer</span>
                                    </button>
                                )}
                                {isCreator && (
                                    <>
                                        <button className="dropdown-item" onClick={() => { setShowEventMenu(false); navigate(`/create?edit=${id}`); }}>
                                            <i className="fas fa-edit"></i>
                                            <span>Edit Event</span>
                                        </button>
                                        <button className="dropdown-item dropdown-item-danger" onClick={() => { setShowEventMenu(false); setShowDeleteModal(true); }}>
                                            <i className="fas fa-trash"></i>
                                            <span>Delete Event</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="event-details-scroll">
                <div className="event-flyer-section">
                    <img src={event.flyerUrl || "https://placehold.co/800x1000/EEE/DDD/png"} alt="Event Flyer" className="event-flyer-img" />
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

            {/* Bottom Actions */}
            {hasJoined && !isCreator && (
                <div className="event-bottom-actions">
                    <button className="action-btn-primary" onClick={() => setShowRsvpSheet(true)} style={{ width: '100%' }}>
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

            {/* RSVP Management Bottom Sheet */}
            {showRsvpSheet && (
                <>
                    <div className="action-sheet-overlay" onClick={() => setShowRsvpSheet(false)}></div>
                    <div className="action-sheet">
                        <div className="action-sheet-handle"></div>
                        <div className="action-sheet-content">
                            <div className="action-sheet-status">
                                <i className="fas fa-check-circle"></i>
                                <span>RSVP Confirmed</span>
                            </div>
                            <div className="action-sheet-actions">
                                <button className="action-sheet-btn" onClick={() => { setShowRsvpSheet(false); navigate(`/rsvp/${id}?view=true&rsvpId=${userRsvpId}`); }}>
                                    <i className="fas fa-eye"></i>
                                    <span>View Entry Details</span>
                                </button>
                                <button className="action-sheet-btn" onClick={() => { setShowRsvpSheet(false); navigate(`/rsvp/${id}?edit=true&rsvpId=${userRsvpId}`); }}>
                                    <i className="fas fa-edit"></i>
                                    <span>Edit Entry</span>
                                </button>
                                <button className="action-sheet-btn action-sheet-btn-danger" onClick={() => { setShowRsvpSheet(false); setShowExitModal(true); }}>
                                    <i className="fas fa-sign-out-alt"></i>
                                    <span>Exit Guestlist</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Exit Confirmation Modal */}
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

            {/* Delete Event Modal */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-header">
                            <h3>Delete Event</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete this event? All guestlist data will be lost. This action cannot be undone.</p>
                        </div>
                        <div className="modal-footer">
                            <button className="secondary-btn" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
                            <button className="danger-btn" onClick={handleDeleteEvent} disabled={deleting}>
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
