import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, updateDoc, increment, serverTimestamp, setDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const docRef = doc(db, "lists", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEvent({ id: docSnap.id, ...docSnap.data() });
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
                    setGuests([{
                        name: userName,
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
    };

    const handleAddFromFriends = () => {
        const addedEmails = guests.map(g => g.email?.toLowerCase()).filter(Boolean);
        const addedPhones = guests.map(g => g.phone?.replace(/[^0-9]/g, '')).filter(Boolean);
        const availableFriends = friends.filter(f => {
            const emailMatch = f.email && addedEmails.includes(f.email.toLowerCase());
            const phoneMatch = f.phone && addedPhones.includes(f.phone.replace(/[^0-9]/g, ''));
            return !emailMatch && !phoneMatch;
        });
        if (availableFriends.length === 0) {
            alert('All friends have been added');
            return;
        }
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
                alert("RSVP Updated!");
                navigate(`/event/${id}`);
            } else {
                await addDoc(collection(db, `lists/${id}/rsvps`), {
                    userId: user.uid,
                    eventId: id,
                    guests: cleanGuests,
                    createdAt: serverTimestamp(),
                    status: 'confirmed'
                });

                const eventRef = doc(db, 'lists', id);
                await updateDoc(eventRef, {
                    attendeesCount: increment(guests.length)
                });

                const userRsvps = JSON.parse(localStorage.getItem('userRsvps') || '[]');
                if (!userRsvps.includes(id)) {
                    userRsvps.push(id);
                    localStorage.setItem('userRsvps', JSON.stringify(userRsvps));
                }

                for (const guest of cleanGuests) {
                    if (guest.email || guest.phone) {
                        try {
                            const friendId = guest.email || guest.phone;
                            const friendRef = doc(db, `users/${user.uid}/friends`, friendId);
                            await setDoc(friendRef, {
                                name: guest.name,
                                email: guest.email || null,
                                phone: guest.phone || null,
                                gender: guest.gender,
                                linkedUid: null,
                                addedAt: serverTimestamp()
                            }, { merge: true });
                        } catch (e) {
                            console.warn("Friend add failed", e);
                        }
                    }
                }

                alert("RSVP Confirmed!");
                navigate('/lists');
            }
        } catch (error) {
            console.error("RSVP failed:", error);
            alert("Failed to save RSVP");
        }
        setSubmitting(false);
    };

    if (loading) return <div className="screen center-msg">Loading...</div>;
    if (!event) return <div className="screen center-msg">Event not found</div>;

    const isReadOnly = mode === 'view';
    const headerTitle = mode === 'view' ? 'RSVP Details' : mode === 'edit' ? 'Edit RSVP' : 'Add to list';

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">{headerTitle}</span>
                </div>
                <div className="header-right"></div>
            </header>

            <div className="screen-content padding-x scrollable-form" style={{ paddingTop: 20 }}>
                {mode === 'view' && (
                    <div className="rsvp-view-badge" style={{ padding: 12, background: 'rgba(52, 35, 166, 0.08)', border: '1px solid rgba(52, 35, 166, 0.2)', borderRadius: 8, marginBottom: 16, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--primary)' }}>
                        <i className="fas fa-info-circle"></i> Viewing RSVP Details
                    </div>
                )}

                <div className="event-mini-header" style={{ marginBottom: 20 }}>
                    <h3>{event.eventName || event.name}</h3>
                    <p style={{ color: 'var(--text-muted)' }}>{event.date} • {event.location}</p>
                </div>

                <div id="guestsListContainer">
                    {guests.map((guest, index) => (
                        <div key={index} className="guest-row" style={{ marginBottom: 16, padding: 16, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}>
                            <div className="guest-row-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span className="guest-label" style={{ fontWeight: 700 }}>{guest.isSelf ? 'You (Primary)' : `Guest ${index + 1}`}</span>
                                {!guest.isSelf && !isReadOnly && <button type="button" onClick={() => removeGuest(index)} style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }}><i className="fas fa-trash"></i> Remove</button>}
                            </div>
                            <div className="guest-inputs" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <input
                                    type="text"
                                    placeholder="Full Name"
                                    className="common-input"
                                    value={guest.name}
                                    onChange={(e) => handleGuestChange(index, 'name', e.target.value)}
                                    disabled={isReadOnly}
                                    style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 4, width: '100%' }}
                                />
                                <input
                                    type="email"
                                    placeholder="Email (optional)"
                                    className="common-input"
                                    value={guest.email || ''}
                                    onChange={(e) => handleGuestChange(index, 'email', e.target.value)}
                                    disabled={isReadOnly}
                                    style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 4, width: '100%' }}
                                />
                                <div className="phone-input-group">
                                    <span className="country-code">+91</span>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number"
                                        value={guest.phone}
                                        onChange={(e) => handleGuestChange(index, 'phone', e.target.value)}
                                        maxLength="10"
                                        disabled={isReadOnly}
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
                        disabled={(mode === 'create' && !termsAccepted) || submitting}
                    >
                        {submitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Confirm RSVP'}
                    </button>
                )}
            </div>

            {showFriendsPicker && (
                <>
                    <div className="action-sheet-overlay" onClick={() => setShowFriendsPicker(false)}></div>
                    <div className="action-sheet">
                        <div className="action-sheet-handle"></div>
                        <div className="action-sheet-content">
                            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Select Friends</h3>
                            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                                {friends.filter(f => !guests.some(g => (g.email && g.email === f.email) || (g.phone && g.phone.replace(/[^0-9]/g, '') === f.phone?.replace(/[^0-9]/g, '')))).map(friend => (
                                    <label key={friend.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, cursor: 'pointer', background: selectedFriends.includes(friend.id) ? 'rgba(52, 35, 166, 0.05)' : 'transparent' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedFriends.includes(friend.id)}
                                            onChange={() => handleFriendSelect(friend.id)}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontWeight: 600, fontSize: 15 }}>{friend.name}</span>
                                                {friend.linkedUid && (
                                                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--success)', background: 'rgba(52, 199, 89, 0.1)', padding: '2px 4px', borderRadius: 3 }}>✓</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{friend.email || friend.phone} • {friend.gender}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button onClick={handleConfirmFriends} className="primary-btn" disabled={selectedFriends.length === 0}>
                                Add {selectedFriends.length} Friend{selectedFriends.length !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
