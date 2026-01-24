import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, increment, getDoc } from 'firebase/firestore';

export default function ViewGuests() {
    const { id } = useParams(); // eventId
    const navigate = useNavigate();
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({ total: 0, male: 0, female: 0, other: 0 });

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
                        allGuests.push({
                            ...guest,
                            rsvpId: docSnap.id,
                            guestIndex: index,
                            originalCreatedAt: rsvpData.createdAt
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

                // Decrement count
                const eventRef = doc(db, 'lists', id);
                await updateDoc(eventRef, {
                    attendeesCount: increment(-1)
                });
            }
        } catch (err) {
            console.error("Error deleting guest:", err);
            alert("Failed to delete guest");
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
                <div className="header-right">
                    <button className="icon-btn-plain"><i className="fas fa-download"></i></button>
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
                    {loading ? <p>Loading...</p> : filteredGuests.length === 0 ? <p>No guests found.</p> : (
                        filteredGuests.map((guest, i) => (
                            <div key={i} className="guest-row" style={{ background: guest.arrived ? '#f0fff4' : 'white' }}>
                                <div className="guest-row-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <span className="guest-badge" style={{
                                            background: guest.gender === 'male' ? '#6987C9' : (guest.gender === 'female' ? '#EE92C2' : '#000'),
                                            width: 8, height: 8, borderRadius: '50%'
                                        }}></span>
                                        <span className="guest-name" style={{ fontWeight: 600 }}>{guest.name}</span>
                                        {guest.arrived && <span className="arrived-badge"><i className="fas fa-check"></i> Arrived</span>}
                                    </div>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 13, color: '#888' }}>
                                    <i className="fas fa-phone"></i> {guest.phone}
                                </div>
                                <div className="guest-actions" style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12, display: 'flex', gap: 12 }}>
                                    <button
                                        className={`guest-action-btn ${guest.arrived ? 'is-arrived' : 'btn-arrived'}`}
                                        onClick={() => handleMarkArrived(guest)}
                                        style={{ flex: 1 }}
                                    >
                                        {guest.arrived ? 'Undo Arrival' : 'Mark Arrived'}
                                    </button>
                                    <button className="guest-action-btn btn-delete" onClick={() => handleDeleteGuest(guest)} style={{ width: 40 }}>
                                        <i className="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
