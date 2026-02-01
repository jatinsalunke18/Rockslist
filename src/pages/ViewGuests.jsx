import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, increment, getDoc, serverTimestamp, getDocs, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { createRSVP } from '../lib/rsvpHelper';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Header from '../components/Header';
import Modal from '../components/Modal';
import AddGuestModal from '../components/AddGuestModal';
import FriendsPicker from '../components/FriendsPicker';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';

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
    }, [id, event]);

    const handleAddManualGuest = async (e) => {
        if (e) e.preventDefault();
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

            await updateDoc(doc(db, 'lists', id), {
                attendeesCount: increment(1)
            });

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
        try {
            const doc = new jsPDF();
            const eventName = event?.eventName || event?.name || 'Event';

            doc.setFontSize(20);
            doc.setTextColor(33, 33, 33);
            doc.text(`Guest List: ${eventName}`, 14, 22);

            doc.setFontSize(11);
            doc.setTextColor(100, 100, 100);
            doc.text(`Date: ${event?.date || 'N/A'} | Venue: ${event?.location || 'N/A'}`, 14, 30);
            doc.text(`Total Guests: ${stats.total} (M: ${stats.male}, F: ${stats.female}, O: ${stats.other})`, 14, 38);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 46);

            const tableColumn = ["#", "Name", "Phone Number", "Email Address", "Gender", "Status"];
            const tableRows = filteredGuests.map((guest, index) => [
                index + 1,
                guest.name,
                guest.phone || 'N/A',
                guest.email || 'N/A',
                guest.gender ? guest.gender.charAt(0).toUpperCase() + guest.gender.slice(1) : 'N/A',
                guest.arrived ? 'Arrived' : 'Pending'
            ]);

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

            doc.save(`GuestList_${eventName.replace(/\s+/g, '_')}.pdf`);
        } catch (error) {
            console.error("PDF Generation Error:", error);
            alert("Failed to generate PDF");
        }
    };

    const filteredGuests = guests.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (g.phone && g.phone.includes(searchTerm))
    );

    const handleFriendSelect = (friendId) => {
        if (selectedFriends.includes(friendId)) {
            setSelectedFriends(selectedFriends.filter(tid => tid !== friendId));
        } else {
            setSelectedFriends([...selectedFriends, friendId]);
        }
    };

    return (
        <section className="screen active">
            <Header
                showBack={true}
                title="Guest List"
                right={
                    <button className="icon-btn-plain" onClick={handleDownloadPDF} title="Download List">
                        <i className="fas fa-download"></i>
                    </button>
                }
            />

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
                        <LoadingSpinner />
                    ) : filteredGuests.length === 0 ? (
                        <EmptyState
                            icon="fa-users"
                            title="No guests found"
                            description="Add guests to start building your list"
                        />
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
                                                className={`action-btn-sm ${guest.arrived ? 'success-outline' : 'primary'}`}
                                                style={{ flex: 1 }}
                                            >
                                                <i className={`fas ${guest.arrived ? 'fa-undo' : 'fa-check'}`}></i>
                                                {guest.arrived ? 'Undo' : 'Mark Arrived'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteGuest(guest)}
                                                className="action-btn-sm danger-outline"
                                            >
                                                <i className="fas fa-trash"></i>
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

            <AddGuestModal
                show={showManualAdd}
                onClose={() => setShowManualAdd(false)}
                onAdd={handleAddManualGuest}
                isSaving={isSaving}
                manualGuest={manualGuest}
                setManualGuest={setManualGuest}
                title="Add Guest Manually"
                subtitle="This guest will receive confirmation if email is provided"
            />

            <FriendsPicker
                show={showFriendsPicker}
                onClose={() => setShowFriendsPicker(false)}
                friends={friends}
                selectedFriends={selectedFriends}
                onSelect={handleFriendSelect}
                onConfirm={handleConfirmFriends}
                isSaving={isSaving}
            />
        </section>
    );
}
