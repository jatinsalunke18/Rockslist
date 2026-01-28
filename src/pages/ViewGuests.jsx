import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, increment, getDoc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { createRSVP } from '../lib/rsvpHelper';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ViewGuests() {
    const { id } = useParams(); // eventId
    const navigate = useNavigate();
    const { user } = useAuth();
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, male: 0, female: 0, other: 0 });

    const [showManualAdd, setShowManualAdd] = useState(false);
    const [manualGuest, setManualGuest] = useState({ name: '', phone: '', email: '', gender: 'male' });
    const [friends, setFriends] = useState([]);
    const [showFriendsPicker, setShowFriendsPicker] = useState(false);
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [event, setEvent] = useState(null);

    useEffect(() => {
        const fetchEvent = async () => {
            const docSnap = await getDoc(doc(db, "lists", id));
            if (docSnap.exists()) setEvent(docSnap.data());
        };
        fetchEvent();
    }, [id]);

    useEffect(() => {
        if (!user) return;
        const fetchFriends = async () => {
            const friendsRef = collection(db, `users/${user.uid}/friends`);
            const friendsSnapshot = await getDocs(friendsRef);
            const friendsList = friendsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFriends(friendsList);
        };
        fetchFriends();
    }, [user]);

    useEffect(() => {
        const rsvpsRef = collection(db, `lists/${id}/rsvps`);
        const q = query(rsvpsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let allGuests = [];
            let total = 0, male = 0, female = 0, other = 0;

            snapshot.docs.forEach(docSnap => {
                const rsvpData = docSnap.data();
                if (rsvpData.guests && Array.isArray(rsvpData.guests)) {
                    rsvpData.guests.forEach((guest, index) => {
                        const isHostRsvp = event && rsvpData.userId === event.createdBy;
                        const isHostEntry = isHostRsvp && index === 0 && !rsvpData.addedBy;

                        allGuests.push({
                            ...guest,
                            rsvpId: docSnap.id,
                            guestIndex: index,
                            originalCreatedAt: rsvpData.createdAt,
                            isHostEntry: isHostEntry,
                            isManualEntry: rsvpData.addedBy === 'organizer'
                        });

                        total++;
                        const g = guest.gender?.toLowerCase();
                        if (g === 'male') male++;
                        else if (g === 'female') female++;
                        else other++;
                    });
                }
            });

            setStats({ total, male, female, other });
            setGuests(allGuests);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [id]);

    const handleAddManualGuest = async (e) => {
        e.preventDefault();
        if (!manualGuest.name || !manualGuest.phone) return alert("Name and phone are required");

        setIsSaving(true);
        try {
            const cleanGuest = {
                name: manualGuest.name,
                phone: manualGuest.phone.startsWith('+91') ? manualGuest.phone : '+91' + manualGuest.phone.replace(/[^0-9]/g, ''),
                email: manualGuest.email?.toLowerCase() || null,
                gender: manualGuest.gender,
                rsvpTime: new Date().toISOString()
            };

            // Use centralized RSVP helper (includes email sending)
            await createRSVP({
                eventId: id,
                userId: user.uid,
                guests: [cleanGuest],
                eventData: {
                    name: event.eventName || event.name,
                    date: event.date,
                    time: event.time,
                    location: event.location,
                    city: event.city
                },
                addedBy: 'organizer'
            });

            // Update attendee count
            await updateDoc(doc(db, 'lists', id), {
                attendeesCount: increment(1)
            });

            // AUTO-SAVE TO FRIENDS (exclude self)
            const friendId = cleanGuest.email || cleanGuest.phone;
            if (friendId) {
                const isSelf = cleanGuest.email?.toLowerCase() === user.email?.toLowerCase() ||
                    cleanGuest.phone?.replace(/[^0-9]/g, '') === user.phoneNumber?.replace(/[^0-9]/g, '');
                if (!isSelf) {
                    await setDoc(doc(db, `users/${user.uid}/friends`, friendId), {
                        name: cleanGuest.name,
                        email: cleanGuest.email || null,
                        phone: cleanGuest.phone || null,
                        gender: cleanGuest.gender,
                        addedAt: serverTimestamp()
                    }, { merge: true });
                }
            }

            setShowManualAdd(false);
            setManualGuest({ name: '', phone: '', email: '', gender: 'male' });
        } catch (err) {
            console.error("Manual add failed:", err);
            alert("Failed to add guest");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmFriends = async () => {
        if (selectedFriends.length === 0) return;
        setIsSaving(true);
        try {
            const selectedFriendsData = selectedFriends.map(friendId => {
                const f = friends.find(friend => friend.id === friendId);
                return {
                    name: f.name,
                    phone: f.phone ? (f.phone.startsWith('+91') ? f.phone : '+91' + f.phone.replace(/[^0-9]/g, '')) : null,
                    email: f.email?.toLowerCase() || null,
                    gender: f.gender || 'male',
                    rsvpTime: new Date().toISOString()
                };
            });

            // Use centralized RSVP helper for each friend (includes email sending)
            const rsvpPromises = selectedFriendsData.map(guest =>
                createRSVP({
                    eventId: id,
                    userId: user.uid,
                    guests: [guest],
                    eventData: {
                        name: event.eventName || event.name,
                        date: event.date,
                        time: event.time,
                        location: event.location,
                        city: event.city
                    },
                    addedBy: 'organizer'
                })
            );

            await Promise.all(rsvpPromises);

            // Update attendee count
            await updateDoc(doc(db, 'lists', id), {
                attendeesCount: increment(selectedFriendsData.length)
            });

            setShowFriendsPicker(false);
            setSelectedFriends([]);
        } catch (err) {
            console.error("Add friends failed:", err);
            alert("Failed to add friends");
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkArrived = async (guest) => {
        try {
            const rsvpRef = doc(db, `lists/${id}/rsvps`, guest.rsvpId);
            const snap = await getDoc(rsvpRef);
            if (snap.exists()) {
                const data = snap.data();
                const guestList = data.guests || [];
                if (guestList[guest.guestIndex]) {
                    guestList[guest.guestIndex].arrived = !guest.arrived;
                    await updateDoc(rsvpRef, { guests: guestList });
                }
            }
        } catch (err) {
            console.error("Error marking arrived:", err);
            alert("Action failed");
        }
    };

    const handleDeleteGuest = async (guest) => {
        if (!window.confirm("Delete this guest?")) return;
        try {
            const rsvpRef = doc(db, `lists/${id}/rsvps`, guest.rsvpId);
            const snap = await getDoc(rsvpRef);
            if (snap.exists()) {
                const data = snap.data();
                const guestList = data.guests || [];
                guestList.splice(guest.guestIndex, 1);

                if (guestList.length === 0) {
                    await deleteDoc(rsvpRef);
                } else {
                    await updateDoc(rsvpRef, { guests: guestList });
                }

                // Decrement count (Do not decrement if it was the host's spot)
                if (!guest.isHostEntry) {
                    const eventRef = doc(db, 'lists', id);
                    await updateDoc(eventRef, {
                        attendeesCount: increment(-1)
                    });
                }
            }
        } catch (err) {
            console.error("Error deleting guest:", err);
            alert("Failed to delete guest");
        }
    };

    const handleDownloadPDF = () => {
        console.log("📥 Download PDF initiated...");
        try {
            const doc = new jsPDF();
            const eventName = event?.eventName || event?.name || 'Event';

            console.log("📝 Generating table for event:", eventName);

            // Add Title
            doc.setFontSize(20);
            doc.setTextColor(33, 33, 33);
            doc.text(`Guest List: ${eventName}`, 14, 22);

            // Add Meta Info
            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text(`Date: ${event?.date || 'N/A'} | Venue: ${event?.location || 'N/A'}`, 14, 30);
            doc.text(`Total Guests: ${stats.total} (M: ${stats.male}, F: ${stats.female}, O: ${stats.other})`, 14, 38);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 46);

            // Define table columns
            const tableColumn = ["#", "Name", "Phone Number", "Email Address", "Gender", "Status"];

            // Define table rows
            const tableRows = filteredGuests.map((guest, index) => [
                index + 1,
                guest.name,
                guest.phone || 'N/A',
                guest.email || 'N/A',
                guest.gender ? guest.gender.charAt(0).toUpperCase() + guest.gender.slice(1) : 'N/A',
                guest.arrived ? 'Arrived' : 'Pending'
            ]);

            // Generate table
            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 55,
                theme: 'grid',
                headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                alternateRowStyles: { fillColor: [250, 250, 250] },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 50 },
                    4: { cellWidth: 20 },
                    5: { cellWidth: 25 }
                }
            });

            console.log("💾 Saving PDF...");
            // Save PDF
            doc.save(`GuestList_${eventName.replace(/\s+/g, '_')}.pdf`);
            console.log("✅ PDF Saved successfully.");
        } catch (error) {
            console.error("❌ PDF Generation Error:", error);
            alert("Failed to generate PDF. Check console for details.");
        }
    };

    const filteredGuests = guests.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.phone && g.phone.includes(searchTerm))
    );

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">Guest List</span>
                </div>
                <div className="header-right" style={{ display: 'flex', gap: 8 }}>
                    <button
                        className="icon-btn-plain"
                        title="Download List"
                        onClick={handleDownloadPDF}
                    >
                        <i className="fas fa-download"></i>
                    </button>
                </div>
            </header>

            <div className="screen-content">
                <div className="search-container-screen" style={{ padding: '0 24px 16px 24px' }}>
                    <div className="search-input-wrapper">
                        <i className="fas fa-search"></i>
                        <input
                            type="text"
                            placeholder="Search guests..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="guests-summary-card glass-card" style={{ display: 'flex', justifyContent: 'space-between', margin: '0 24px 20px' }}>
                    <div className="summary-item">
                        <span className="summary-label">Total</span>
                        <span className="summary-value" style={{ fontWeight: 'bold', display: 'block' }}>{stats.total}</span>
                    </div>
                    <div className="summary-divider" style={{ width: 1, background: 'rgba(255,255,255,0.3)' }}></div>
                    <div className="summary-item">
                        <span className="summary-label">Male</span>
                        <span className="summary-value" style={{ fontWeight: 'bold', display: 'block' }}>{stats.male}</span>
                    </div>
                    <div className="summary-divider" style={{ width: 1, background: 'rgba(255,255,255,0.3)' }}></div>
                    <div className="summary-item">
                        <span className="summary-label">Female</span>
                        <span className="summary-value" style={{ fontWeight: 'bold', display: 'block' }}>{stats.female}</span>
                    </div>
                </div>

                <div className="guests-list-container" style={{ padding: '0 24px 100px' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ padding: 16, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--border)' }}></div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ height: 16, width: '60%', background: 'var(--border)', borderRadius: 4, marginBottom: 8 }}></div>
                                            <div style={{ height: 12, width: '40%', background: 'var(--border)', borderRadius: 4 }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredGuests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <i className="fas fa-users" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3, marginBottom: 16 }}></i>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No guests found</h3>
                            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Add guests to start building your list</p>
                        </div>
                    ) : (
                        filteredGuests.map((guest, i) => (
                            <div key={i} style={{
                                padding: 16,
                                background: guest.arrived ? 'rgba(52, 199, 89, 0.05)' : 'var(--surface)',
                                borderRadius: 12,
                                border: `1px solid ${guest.arrived ? 'rgba(52, 199, 89, 0.2)' : 'var(--border)'}`,
                                marginBottom: 12,
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: 48,
                                        height: 48,
                                        borderRadius: '50%',
                                        background: guest.gender === 'male' ? '#6987C9' : guest.gender === 'female' ? '#EE92C2' : '#888',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: 18,
                                        flexShrink: 0
                                    }}>
                                        {guest.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-main)' }}>{guest.name}</span>
                                            {guest.arrived && (
                                                <span style={{
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    color: 'var(--success)',
                                                    background: 'rgba(52, 199, 89, 0.15)',
                                                    padding: '2px 8px',
                                                    borderRadius: 12,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4
                                                }}>
                                                    <i className="fas fa-check-circle" style={{ fontSize: 10 }}></i>
                                                    Arrived
                                                </span>
                                            )}
                                            {guest.isHostEntry && (
                                                <span style={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    color: 'var(--primary)',
                                                    background: 'rgba(99, 102, 241, 0.1)',
                                                    padding: '2px 6px',
                                                    borderRadius: 4
                                                }}>Host</span>
                                            )}
                                            {guest.isManualEntry && (
                                                <span style={{
                                                    fontSize: 10,
                                                    fontWeight: 600,
                                                    color: '#666',
                                                    background: '#f5f5f5',
                                                    padding: '2px 6px',
                                                    borderRadius: 4
                                                }}>Added by Host</span>
                                            )}
                                        </div>
                                        {guest.email && (
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <i className="fas fa-envelope" style={{ fontSize: 11 }}></i>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guest.email}</span>
                                            </div>
                                        )}
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <i className="fas fa-phone" style={{ fontSize: 11 }}></i>
                                            {guest.phone}
                                        </div>
                                        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                                            <button
                                                onClick={() => handleMarkArrived(guest)}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 16px',
                                                    border: guest.arrived ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid var(--primary)',
                                                    borderRadius: 8,
                                                    background: guest.arrived ? 'transparent' : 'var(--primary)',
                                                    color: guest.arrived ? 'var(--success)' : 'white',
                                                    fontSize: 14,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 6
                                                }}
                                            >
                                                <i className={`fas ${guest.arrived ? 'fa-undo' : 'fa-check'}`} style={{ fontSize: 12 }}></i>
                                                {guest.arrived ? 'Undo' : 'Mark Arrived'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGuest(guest)}
                                                style={{
                                                    padding: '10px 14px',
                                                    border: '1px solid rgba(255, 59, 48, 0.2)',
                                                    borderRadius: 8,
                                                    background: 'transparent',
                                                    color: 'var(--error)',
                                                    fontSize: 14,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <i className="fas fa-trash" style={{ fontSize: 14 }}></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="event-bottom-actions" style={{ gap: 12 }}>
                <button className="action-btn-secondary" onClick={() => setShowManualAdd(true)} style={{ flex: 1 }}>
                    <i className="fas fa-user-plus"></i> Add Guest
                </button>
                <button className="action-btn-primary" onClick={() => setShowFriendsPicker(true)} style={{ flex: 1 }}>
                    <i className="fas fa-user-friends"></i> Friends
                </button>
            </div>

            {showManualAdd && (
                <div className="modal-overlay">
                    <div className="custom-modal" style={{ maxWidth: 420 }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Add Guest Manually</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>This guest will receive confirmation if email is provided</p>
                        </div>
                        <form onSubmit={handleAddManualGuest}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px' }}>
                                <div style={{ position: 'relative' }}>
                                    <i className="fas fa-user" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}></i>
                                    <input
                                        type="text"
                                        placeholder="Full Name *"
                                        className="common-input"
                                        value={manualGuest.name}
                                        onChange={(e) => setManualGuest({ ...manualGuest, name: e.target.value })}
                                        required
                                        style={{ paddingLeft: 40, height: 48, fontSize: 15, borderRadius: 8 }}
                                    />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <i className="fas fa-phone" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}></i>
                                    <input
                                        type="tel"
                                        placeholder="Phone Number *"
                                        className="common-input"
                                        value={manualGuest.phone}
                                        onChange={(e) => setManualGuest({ ...manualGuest, phone: e.target.value })}
                                        required
                                        maxLength="10"
                                        style={{ paddingLeft: 40, height: 48, fontSize: 15, borderRadius: 8 }}
                                    />
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <i className="fas fa-envelope" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}></i>
                                    <input
                                        type="email"
                                        placeholder="Email (Optional)"
                                        className="common-input"
                                        value={manualGuest.email}
                                        onChange={(e) => setManualGuest({ ...manualGuest, email: e.target.value })}
                                        style={{ paddingLeft: 40, height: 48, fontSize: 15, borderRadius: 8 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>Gender</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        {['male', 'female', 'other'].map(g => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setManualGuest({ ...manualGuest, gender: g })}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 16px',
                                                    border: `2px solid ${manualGuest.gender === g ? 'var(--primary)' : 'var(--border)'}`,
                                                    borderRadius: 8,
                                                    background: manualGuest.gender === g ? 'rgba(52, 35, 166, 0.08)' : 'transparent',
                                                    color: manualGuest.gender === g ? 'var(--primary)' : 'var(--text-main)',
                                                    fontWeight: manualGuest.gender === g ? 600 : 500,
                                                    fontSize: 14,
                                                    textTransform: 'capitalize',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    className="secondary-btn"
                                    onClick={() => {
                                        setShowManualAdd(false);
                                        setManualGuest({ name: '', phone: '', email: '', gender: 'male' });
                                    }}
                                    disabled={isSaving}
                                    style={{ flex: 1, height: 48, fontSize: 15, fontWeight: 600 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={isSaving || !manualGuest.name || !manualGuest.phone}
                                    style={{ flex: 1, height: 48, fontSize: 15, fontWeight: 600 }}
                                >
                                    {isSaving ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                                            Adding...
                                        </>
                                    ) : 'Add Guest'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showFriendsPicker && (
                <>
                    <div className="action-sheet-overlay" onClick={() => setShowFriendsPicker(false)}></div>
                    <div className="action-sheet">
                        <div className="action-sheet-handle"></div>
                        <div className="action-sheet-content">
                            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>Add from Friends</h3>
                            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {friends.length === 0 ? (
                                    <p style={{ textAlign: 'center', py: 20 }}>No friends found</p>
                                ) : (
                                    friends.map(friend => (
                                        <label key={friend.id} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 12,
                                            padding: 12,
                                            border: '1px solid var(--border)',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: selectedFriends.includes(friend.id) ? 'rgba(52, 35, 166, 0.05)' : 'white'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedFriends.includes(friend.id)}
                                                onChange={() => {
                                                    if (selectedFriends.includes(friend.id)) {
                                                        setSelectedFriends(selectedFriends.filter(tid => tid !== friend.id));
                                                    } else {
                                                        setSelectedFriends([...selectedFriends, friend.id]);
                                                    }
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{friend.name}</div>
                                                <div style={{ fontSize: 12, color: '#888' }}>{friend.phone || friend.email}</div>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setShowFriendsPicker(false)} disabled={isSaving}>Cancel</button>
                                <button className="primary-btn" style={{ flex: 2 }} onClick={handleConfirmFriends} disabled={isSaving || selectedFriends.length === 0}>
                                    {isSaving ? 'Adding...' : `Add ${selectedFriends.length} Selected`}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
