import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, updateDoc, increment, serverTimestamp, setDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { validateGuestIdentity, findDuplicateGuest, checkEventLevelDuplicate, isEventClosed } from '../lib/validation';
import { createRSVP, notifyRSVPEdit, notifyHostNewGuest } from '../lib/rsvpHelper';
import Header from '../components/Header';
import LoadingSpinner from '../components/LoadingSpinner';
import ActionSheet from '../components/ActionSheet';
import FriendsPicker from '../components/FriendsPicker';

export default function Rsvp() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('view') ? 'view' : searchParams.get('edit') ? 'edit' : 'create';
    const providedRsvpId = searchParams.get('rsvpId');

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [guests, setGuests] = useState([]);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [rsvpId, setRsvpId] = useState(null);
    const [friends, setFriends] = useState([]);
    const [showFriendsPicker, setShowFriendsPicker] = useState(false);
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [guestErrors, setGuestErrors] = useState({});
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const docRef = doc(db, "lists", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setEvent({ id: docSnap.id, ...data });
                }

                const friendsRef = collection(db, `users/${user.uid}/friends`);
                const friendsSnapshot = await getDocs(friendsRef);
                const friendsList = friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFriends(friendsList);

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};
                const userPhone = userData.phone || user.phoneNumber || '';
                const userName = userData.name || user.displayName || '';
                const userEmail = user.email?.toLowerCase().trim();

                if (mode === 'view' || mode === 'edit') {
                    let targetRsvpId = providedRsvpId;

                    if (!targetRsvpId) {
                        const rsvpsRef = collection(db, `lists/${id}/rsvps`);
                        const q = query(rsvpsRef, where("userId", "==", user.uid));
                        const querySnapshot = await getDocs(q);
                        if (!querySnapshot.empty) {
                            targetRsvpId = querySnapshot.docs[0].id;
                        }
                    }

                    if (targetRsvpId) {
                        setRsvpId(targetRsvpId);
                        const rsvpDoc = await getDoc(doc(db, `lists/${id}/rsvps`, targetRsvpId));

                        if (rsvpDoc.exists()) {
                            const rsvpData = rsvpDoc.data();
                            if (rsvpData.guests && Array.isArray(rsvpData.guests)) {
                                let guestsToLoad = [];

                                if (rsvpData.userId === user.uid) {
                                    guestsToLoad = rsvpData.guests.map((g, idx) => ({
                                        name: g.name || '',
                                        email: g.email || '',
                                        phone: g.phone?.replace('+91', '') || '',
                                        gender: g.gender || '',
                                        isSelf: idx === 0
                                    }));
                                } else {
                                    const matchedGuest = rsvpData.guests.find(guest => {
                                        if (userEmail && guest.email?.toLowerCase().trim() === userEmail) return true;
                                        if (guest.linkedUid === user.uid) return true;
                                        if (userPhone && guest.phone?.replace(/[^0-9]/g, '') === userPhone.replace(/[^0-9]/g, '')) return true;
                                        return false;
                                    });

                                    if (matchedGuest) {
                                        guestsToLoad = [{
                                            name: matchedGuest.name || '',
                                            email: matchedGuest.email || '',
                                            phone: matchedGuest.phone?.replace('+91', '') || '',
                                            gender: matchedGuest.gender || '',
                                            isSelf: true
                                        }];
                                    }
                                }

                                setGuests(guestsToLoad);
                            }
                        }
                    }
                } else {
                    const userEmail = user.email || '';
                    setGuests([{
                        name: userName,
                        email: userEmail,
                        phone: userPhone.replace('+91', ''),
                        gender: '',
                        isSelf: true
                    }]);
                }
            } catch (err) {
                console.error("Error fetching data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, user, mode, providedRsvpId]);

    const addGuest = () => {
        setGuests([...guests, { name: '', phone: '', gender: 'male', isSelf: false }]);
    };

    const removeGuest = (index) => {
        const newGuests = [...guests];
        newGuests.splice(index, 1);
        setGuests(newGuests);
    };

    const handleGuestChange = (index, field, value) => {
        const newGuests = [...guests];
        newGuests[index][field] = value;
        setGuests(newGuests);
        const newErrors = { ...guestErrors };
        delete newErrors[index];
        setGuestErrors(newErrors);
    };

    const handleAddFromFriends = () => {
        setSelectedFriends([]);
        setShowFriendsPicker(true);
    };

    const handleFriendSelect = (friendId) => {
        if (selectedFriends.includes(friendId)) {
            setSelectedFriends(selectedFriends.filter(id => id !== friendId));
        } else {
            setSelectedFriends([...selectedFriends, friendId]);
        }
    };

    const handleConfirmFriends = () => {
        const newGuests = [...guests];
        selectedFriends.forEach(friendId => {
            const friend = friends.find(f => f.id === friendId);
            if (friend) {
                newGuests.push({
                    name: friend.name,
                    email: friend.email || '',
                    phone: friend.phone ? friend.phone.replace('+91', '') : '',
                    gender: friend.gender,
                    isSelf: false
                });
            }
        });
        setGuests(newGuests);
        setShowFriendsPicker(false);
    };

    const handleSubmit = async () => {
        if (mode === 'create' && !termsAccepted) return;

        if (isEventClosed(event)) {
            alert(`Sorry, this guestlist closed at ${event.closeTime}. No further entries or edits are allowed.`);
            return;
        }

        const errors = {};

        for (let i = 0; i < guests.length; i++) {
            const guest = guests[i];
            const validation = validateGuestIdentity(guest);
            if (!validation.valid) {
                errors[i] = validation.error;
                continue;
            }

            const otherGuests = guests.filter((_, idx) => idx !== i);
            const isPrimaryUser = guest.isSelf;
            const duplicate = findDuplicateGuest(guest, otherGuests, user, isPrimaryUser);
            if (duplicate.isDuplicate) {
                errors[i] = duplicate.error;
            }
        }

        setGuestErrors(errors);
        if (Object.keys(errors).length > 0) return;

        if (mode === 'create') {
            const eventDuplicateCheck = await checkEventLevelDuplicate(db, id, guests, user.uid);
            if (eventDuplicateCheck.isDuplicate) {
                alert(eventDuplicateCheck.error);
                return;
            }
        }

        setSubmitting(true);
        try {
            const cleanGuests = guests.map(g => ({
                name: g.name,
                email: g.email ? g.email.toLowerCase() : null,
                phone: g.phone ? '+91' + g.phone.replace(/[^0-9]/g, '') : null,
                gender: g.gender,
                rsvpTime: new Date().toISOString()
            }));

            if (mode === 'edit' && rsvpId) {
                const rsvpRef = doc(db, `lists/${id}/rsvps`, rsvpId);
                await updateDoc(rsvpRef, {
                    guests: cleanGuests,
                    updatedAt: serverTimestamp()
                });

                await notifyRSVPEdit(user.uid, id, event.eventName || event.name);

                alert("RSVP Updated!");
                navigate(`/event/${id}`);
            } else {
                await createRSVP({
                    eventId: id,
                    userId: user.uid,
                    guests: cleanGuests,
                    eventData: {
                        name: event.eventName || event.name,
                        date: event.date,
                        time: event.time,
                        location: event.location,
                        city: event.city
                    },
                    addedBy: 'self'
                });

                const hostId = event.createdBy;
                const backgroundTasks = [];

                if (hostId && hostId !== user.uid) {
                    backgroundTasks.push(
                        notifyHostNewGuest(hostId, id, event.eventName || event.name, user.displayName || 'Someone')
                    );
                }

                const isHost = user.uid === event.createdBy;
                const countToIncrement = isHost ? cleanGuests.length - 1 : cleanGuests.length;

                if (countToIncrement > 0) {
                    backgroundTasks.push(updateDoc(doc(db, 'lists', id), {
                        attendeesCount: increment(countToIncrement)
                    }));
                }

                cleanGuests.forEach(guest => {
                    const friendId = guest.email || guest.phone;
                    if (friendId) {
                        const isSelf = guest.email?.toLowerCase() === user.email?.toLowerCase() ||
                            guest.phone?.replace(/[^0-9]/g, '') === user.phoneNumber?.replace(/[^0-9]/g, '');
                        if (!isSelf) {
                            backgroundTasks.push(setDoc(doc(db, `users/${user.uid}/friends`, friendId), {
                                name: guest.name,
                                email: guest.email || null,
                                phone: guest.phone || null,
                                gender: guest.gender,
                                addedAt: serverTimestamp()
                            }, { merge: true }));
                        }
                    }
                });

                const userRsvps = JSON.parse(localStorage.getItem('userRsvps') || '[]');
                if (!userRsvps.includes(id)) {
                    userRsvps.push(id);
                    localStorage.setItem('userRsvps', JSON.stringify(userRsvps));
                }

                Promise.all(backgroundTasks).catch(e => console.warn("Background tasks failed", e));

                setIsSuccess(true);
            }
        } catch (error) {
            console.error("RSVP failed:", error);
            alert("Failed to save RSVP");
        }
        setSubmitting(false);
    };

    if (loading) return <LoadingSpinner fullScreen={true} message="Loading RSVP form..." />;
    if (!event) return <div className="screen center-msg">Event not found</div>;

    if (isEventClosed(event) && mode !== 'view') {
        return (
            <section className="screen active">
                <Header showBack={true} />
                <div className="screen-content padding-x center-msg" style={{ textAlign: 'center' }}>
                    <i className="fas fa-clock" style={{ fontSize: 48, color: 'var(--error)', marginBottom: 20, opacity: 0.5 }}></i>
                    <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Guestlist Closed</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                        Sorry, the guestlist for <strong>{event.eventName || event.name}</strong> closed at {event.closeTime}.
                        No further entries or edits are allowed.
                    </p>
                    <button className="primary-btn" onClick={() => navigate(`/event/${id}`)}>
                        Back to Event
                    </button>
                </div>
            </section>
        );
    }

    if (isSuccess) {
        return (
            <div className="screen active">
                <div className="screen-content padding-x" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                    <div className="success-animation" style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>You're on the list!</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Confirmation email has been sent to {user.email}.</p>

                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button className="primary-btn" onClick={() => navigate('/lists')}>
                            View My Guestlists
                        </button>
                        <button className="text-btn" onClick={() => navigate('/')} style={{ marginTop: 12 }}>
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const isReadOnly = mode === 'view';
    const headerTitle = mode === 'view' ? 'RSVP Details' : mode === 'edit' ? 'Edit RSVP' : 'Add to list';

    const filteredFriends = friends.filter(f =>
        !guests.some(g =>
            (g.email && g.email.toLowerCase() === f.email?.toLowerCase()) ||
            (g.phone && g.phone.replace(/[^0-9]/g, '') === f.phone?.replace(/[^0-9]/g, ''))
        )
    );

    return (
        <section className="screen active">
            <Header showBack={true} title={headerTitle} />

            <div className="screen-content padding-x scrollable-form" style={{ paddingTop: 20 }}>
                {mode === 'view' && (
                    <div className="rsvp-view-badge" style={{ padding: 12, background: 'rgba(52, 35, 166, 0.08)', border: '1px solid rgba(52, 35, 166, 0.2)', borderRadius: 8, marginBottom: 16, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
                        <i className="fas fa-info-circle"></i> Viewing RSVP Details
                    </div>
                )}

                <div className="event-mini-header" style={{ marginBottom: 20 }}>
                    <h3>{event.eventName || event.name}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{event.date} • {event.location}</p>
                    {isEventClosed(event) && (
                        <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(255, 59, 48, 0.1)', color: 'var(--error)', borderRadius: 6, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="fas fa-clock"></i>
                            <span>Guestlist Closed ({event.closeTime})</span>
                        </div>
                    )}
                </div>

                <div id="guestsListContainer">
                    {guests.map((guest, index) => (
                        <div key={index} className="guest-row" style={{ marginBottom: 16, padding: 16, border: `1px solid ${guestErrors[index] ? 'var(--error)' : 'var(--border)'}`, borderRadius: 8, background: 'var(--surface)' }}>
                            <div className="guest-row-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span className="guest-label" style={{ fontWeight: 700 }}>{guest.isSelf ? 'You (Primary)' : `Guest ${index + 1}`}</span>
                                {!guest.isSelf && !isReadOnly && <button type="button" onClick={() => removeGuest(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}><i className="fas fa-trash"></i> Remove</button>}
                            </div>
                            {guestErrors[index] && (
                                <div style={{ padding: 8, background: 'rgba(255, 59, 48, 0.1)', borderRadius: 4, marginBottom: 12, color: 'var(--error)', fontSize: 13 }}>
                                    <i className="fas fa-exclamation-circle"></i> {guestErrors[index]}
                                </div>
                            )}
                            <div className="guest-inputs" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="common-input"
                                    value={guest.name}
                                    onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                                    disabled={isReadOnly}
                                    style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 4, width: '100%', background: 'transparent' }}
                                />
                                <input
                                    type="email"
                                    placeholder="Gmail"
                                    className="common-input"
                                    value={guest.email || ''}
                                    onChange={(e) => handleGuestChange(index, 'email', e.target.value)}
                                    disabled={isReadOnly}
                                    style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 4, width: '100%', background: 'transparent' }}
                                />
                                <div className="phone-input-group">
                                    <span className="country-code">+91</span>
                                    <input
                                        type="tel"
                                        placeholder="Phone"
                                        value={guest.phone}
                                        onChange={(e) => handleGuestChange(index, 'phone', e.target.value)}
                                        maxLength="10"
                                        disabled={isReadOnly}
                                        style={{ background: 'transparent' }}
                                    />
                                </div>
                                <div className="gender-select-row" style={{ display: 'flex', gap: 16 }}>
                                    {['male', 'female', 'other'].map(g => (
                                        <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>
                                            <input
                                                type="radio"
                                                name={`gender-${index}`}
                                                value={g}
                                                checked={guest.gender === g}
                                                onChange={(e) => handleGuestChange(index, 'gender', e.target.value)}
                                                disabled={isReadOnly}
                                            />
                                            {g}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {!isReadOnly && (
                    <>
                        <button onClick={addGuest} className="secondary-btn" style={{ marginTop: 16, borderStyle: 'dashed', width: '100%' }}>
                            <i className="fas fa-plus"></i> Add Guest
                        </button>
                        <button onClick={handleAddFromFriends} className="secondary-btn" style={{ marginTop: 12, width: '100%' }}>
                            <i className="fas fa-user-friends"></i> Add from Friends
                        </button>
                    </>
                )}

                {mode === 'create' && (
                    <div className="terms-checkbox-wrapper" style={{ marginTop: 24, marginBottom: 100 }}>
                        <label className="checkbox-container" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} />
                            <span className="terms-text" style={{ fontSize: 13, color: 'var(--text-muted)' }}>I acknowledge that guests added will be created as users on Rockslist.</span>
                        </label>
                    </div>
                )}
            </div>

            <div className="fixed-bottom-action">
                {mode === 'view' ? (
                    <button onClick={() => navigate(`/rsvp/${id}?edit=true`)} className="primary-btn full-width-btn">
                        <i className="fas fa-edit"></i> Edit Entry
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        className="primary-btn full-width-btn"
                        disabled={(mode === 'create' && !termsAccepted) || submitting || Object.keys(guestErrors).length > 0 || isEventClosed(event)}
                    >
                        {isEventClosed(event) ? 'Guestlist Closed' : submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Confirm RSVP'}
                    </button>
                )}
            </div>

            <FriendsPicker
                show={showFriendsPicker}
                onClose={() => setShowFriendsPicker(false)}
                friends={filteredFriends}
                selectedFriends={selectedFriends}
                onSelect={handleFriendSelect}
                onConfirm={handleConfirmFriends}
                isSaving={false}
            />
        </section>
    );
}
