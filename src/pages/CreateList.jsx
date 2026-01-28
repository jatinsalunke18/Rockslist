import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { db, storage } from '../lib/firebase';
import { doc, getDoc, deleteDoc, collection, getDocs, addDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { indianStates } from '../lib/statesData';

export default function CreateList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const editId = searchParams.get('edit');
    const { user, loading: authLoading } = useAuth();
    // Default to loading to prevent flash of empty content, useEffect will resolve it
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

    // ... (rest of state definitions)

    const [formData, setFormData] = useState({
        name: '',
        date: '',
        time: '',
        location: '',
        state: '',
        city: '',
        customCity: '',
        maxAttendees: '',
        closeTime: '',
        ticketLink: '',
        description: '',
        perks: '',
        entryType: [],
        live: true,
        predefinedGuests: []
    });
    const [flyer, setFlyer] = useState(null);
    const [currentFlyerUrl, setCurrentFlyerUrl] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [manualGuest, setManualGuest] = useState({ name: '', phone: '', email: '', gender: 'male' });
    const [showGuestModal, setShowGuestModal] = useState(false);
    const [friends, setFriends] = useState([]);
    const [showFriendsPicker, setShowFriendsPicker] = useState(false);
    const [selectedFriends, setSelectedFriends] = useState([]);

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const closeConfirm = () => setConfirmModal({ show: false, title: '', message: '', onConfirm: null });

    useEffect(() => {
        if (!user) return;
        const fetchFriends = async () => {
            try {
                const friendsRef = collection(db, `users/${user.uid}/friends`);
                const snapshot = await getDocs(friendsRef);
                setFriends(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error("Error fetching friends:", error);
            }
        };
        fetchFriends();
    }, [user]);

    useEffect(() => {
        if (!user) return;

        if (editId) {
            setLoading(true);
            const fetchEvent = async () => {
                try {
                    const docRef = doc(db, "lists", editId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // Ownership check
                        if (data.createdBy !== user?.uid) {
                            console.error("Unauthorized edit attempt");
                            alert("You do not have permission to edit this guestlist.");
                            navigate('/');
                            return;
                        }

                        setFormData({
                            name: data.name || '',
                            date: data.date || '',
                            time: data.time || '',
                            location: data.location || '',
                            city: data.city || '',
                            maxAttendees: data.maxAttendees || '',
                            closeTime: data.closeTime || '',
                            ticketLink: data.ticketLink || '',
                            description: data.description || '',
                            perks: data.perks || '',
                            entryType: data.entryType || [],
                            live: data.live ?? true,
                            predefinedGuests: []
                        });
                        if (data.flyerUrl) setCurrentFlyerUrl(data.flyerUrl);
                    } else {
                        console.error("Event not found");
                        alert("Event not found");
                        navigate('/');
                    }
                } catch (error) {
                    console.error("Error fetching event:", error);
                    alert(`Failed to load event: ${error.message}`);
                } finally {
                    setLoading(false);
                }
            };
            fetchEvent();
        } else {
            // Create mode - reset form if NOT restoring from preview
            // Only reset if we don't have location state (e.g. coming back from preview)
            if (location.state?.formData) {
                setFormData(location.state.formData);
                if (location.state.flyer) setFlyer(location.state.flyer);
                if (location.state.previewUrl) setPreviewUrl(location.state.previewUrl);
                if (location.state.currentFlyerUrl) setCurrentFlyerUrl(location.state.currentFlyerUrl);
            } else {
                console.log("Setting default form data");
                setFormData({
                    name: '',
                    date: '',
                    time: '',
                    location: '',
                    state: '',
                    city: '',
                    maxAttendees: '',
                    closeTime: '',
                    ticketLink: '',
                    description: '',
                    perks: '',
                    entryType: [],
                    live: true,
                    predefinedGuests: []
                });
                setCurrentFlyerUrl('');
                setPreviewUrl('');
                setFlyer(null);
            }
            setLoading(false);
        }
    }, [editId, navigate, location.state, user]);

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            if (checked) return { ...prev, entryType: [...prev.entryType || [], value] };
            return { ...prev, entryType: (prev.entryType || []).filter(type => type !== value) };
        });
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setFlyer(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleRemoveFlyer = () => {
        setFlyer(null);
        setPreviewUrl('');
        setCurrentFlyerUrl(''); // Clear the existing image URL so it can be deleted
    };

    const handleToggleChange = (e) => {
        const { id, checked } = e.target;
        setFormData(prev => ({ ...prev, [id]: checked }));
    };

    const handleAddManualGuest = (e) => {
        e.preventDefault();
        if (!manualGuest.name || !manualGuest.phone) return alert("Name and phone are required");

        const newGuest = {
            ...manualGuest,
            id: Date.now(),
            addedBy: 'organizer'
        };

        setFormData(prev => ({
            ...prev,
            predefinedGuests: [...(prev.predefinedGuests || []), newGuest]
        }));

        setManualGuest({ name: '', phone: '', email: '', gender: 'male' });
        setShowGuestModal(false);
    };

    const removePredefinedGuest = (guestId) => {
        setFormData(prev => ({
            ...prev,
            predefinedGuests: prev.predefinedGuests.filter(g => g.id !== guestId)
        }));
    };

    const handleFriendSelect = (friendId) => {
        if (selectedFriends.includes(friendId)) {
            setSelectedFriends(selectedFriends.filter(id => id !== friendId));
        } else {
            setSelectedFriends([...selectedFriends, friendId]);
        }
    };

    const handleConfirmFriends = () => {
        const selectedInfo = friends.filter(f => selectedFriends.includes(f.id));
        const newPredefined = selectedInfo.map(f => ({
            id: f.id,
            name: f.name,
            phone: f.phone || '',
            email: f.email || '',
            gender: f.gender || 'male',
            addedBy: 'organizer'
        }));

        setFormData(prev => ({
            ...prev,
            predefinedGuests: [...(prev.predefinedGuests || []), ...newPredefined]
        }));

        setSelectedFriends([]);
        setShowFriendsPicker(false);
    };

    const handleDelete = () => {
        if (!editId || loading) return;

        setConfirmModal({
            show: true,
            title: 'Delete Guestlist',
            message: 'Are you sure you want to delete this guestlist? This action cannot be undone.',
            onConfirm: performDelete
        });
    };

    const performDelete = async () => {
        closeConfirm();
        setLoading(true);
        try {
            const eventRef = doc(db, "lists", editId);
            await deleteDoc(eventRef);
            showToast("Guestlist deleted successfully!", "success");
            setTimeout(() => navigate('/'), 1200);
        } catch (error) {
            console.error("Deletion Failed:", error);
            showToast(`Failed to delete: ${error.message}`, "error");
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            alert("You must be logged in to create an event.");
            return;
        }

        // Navigate to preview instead of publishing directly
        navigate('/preview', {
            state: {
                formData,
                flyer,
                previewUrl,
                currentFlyerUrl,
                editId
            }
        });
    };

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">{editId ? 'Edit Guestlist' : 'Create Guestlist'}</span>
                </div>
                <div className="header-right"></div>
            </header>

            {authLoading ? (
                <div className="screen-content center-msg">
                    <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12 }}></i>
                        <p>Verifying access...</p>
                    </div>
                </div>
            ) : !user ? (
                <div className="screen-content center-msg">
                    <div style={{ textAlign: 'center' }}>
                        <p>Please log in to manage guestlists.</p>
                        <button className="primary-btn" onClick={() => navigate('/')} style={{ marginTop: 16 }}>Go Home</button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="screen-content padding-x scrollable-form" style={{ paddingTop: 20 }}>
                        {loading && (
                            <div style={{ textAlign: 'center', padding: 20, color: 'var(--primary)', fontWeight: 600 }}>
                                <i className="fas fa-spinner fa-spin"></i> Loading Event Details...
                            </div>
                        )}
                        <form id="createListForm" onSubmit={handleSubmit} style={{ opacity: loading ? 0.3 : 1, pointerEvents: loading ? 'none' : 'auto' }}>
                            <div className="form-group">
                                <label htmlFor="name">Event Name *</label>
                                <input type="text" id="name" required placeholder="e.g. Roof Party" value={formData.name} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label>Event Flyer</label>
                                <div className="flyer-upload-wrapper">
                                    <div className={`flyer-upload-inner ${(previewUrl || currentFlyerUrl) ? 'has-image' : ''}`} onClick={() => document.getElementById('eventFlyer').click()}>
                                        <input type="file" id="eventFlyer" onChange={handleFileChange} accept="image/*" className="hidden-input" />

                                        {!(previewUrl || currentFlyerUrl) && (
                                            <div className="upload-placeholder">
                                                <i className="fas fa-image"></i>
                                                <span>Tap to upload flyer (4:5)</span>
                                            </div>
                                        )}

                                        {(previewUrl || currentFlyerUrl) && (
                                            <div className="preview-container">
                                                <img src={previewUrl || currentFlyerUrl} alt="Flyer Preview" />
                                                <button type="button" className="remove-flyer-btn" onClick={(e) => { e.stopPropagation(); handleRemoveFlyer(); }}>
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label htmlFor="date">Date *</label>
                                    <input type="date" id="date" required value={formData.date} onChange={handleChange} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="time">Start Time *</label>
                                    <input type="time" id="time" required value={formData.time} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="closeTime">Guestlist Closes At *</label>
                                <input type="time" id="closeTime" required value={formData.closeTime} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="ticketLink">Ticket Link (External)</label>
                                <input type="url" id="ticketLink" placeholder="https://tickets.example.com" value={formData.ticketLink} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="location">Venue *</label>
                                <input type="text" id="location" required placeholder="e.g. Sky Bar" value={formData.location} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="state">State / Region *</label>
                                <select id="state" required value={formData.state} onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData(prev => ({ ...prev, state: val, city: '' }));
                                }}>
                                    <option value="" disabled>Select State</option>
                                    {indianStates.map(item => (
                                        <option key={item.state} value={item.state}>{item.state}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor="city">City *</label>
                                {formData.state === 'Other' ? (
                                    <input
                                        type="text"
                                        id="city"
                                        required
                                        placeholder="Enter city name"
                                        value={formData.city}
                                        onChange={handleChange}
                                    />
                                ) : (
                                    <select id="city" required value={formData.city} onChange={handleChange} disabled={!formData.state}>
                                        <option value="" disabled>{formData.state ? 'Select City' : 'Select State First'}</option>
                                        {indianStates.find(s => s.state === formData.state)?.cities.map(city => (
                                            <option key={city} value={city}>{city}</option>
                                        ))}
                                        <option value="Other">Other</option>
                                    </select>
                                )}
                                {formData.city === 'Other' && formData.state !== 'Other' && (
                                    <input
                                        type="text"
                                        placeholder="Enter custom city name"
                                        style={{ marginTop: 8 }}
                                        value={formData.customCity || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, customCity: e.target.value }))}
                                        onBlur={() => {
                                            if (formData.customCity) {
                                                setFormData(prev => ({ ...prev, city: prev.customCity }));
                                            }
                                        }}
                                    />
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="maxAttendees">Max People *</label>
                                <input type="number" id="maxAttendees" required placeholder="e.g. 100" value={formData.maxAttendees} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label htmlFor="perks">Guestlist Perks</label>
                                <textarea id="perks" rows="2" placeholder="e.g. Free entry, Free shots for ladies..." value={formData.perks} onChange={handleChange}></textarea>
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea id="description" rows="3" placeholder="Tell people about the vibe..." value={formData.description} onChange={handleChange}></textarea>
                            </div>

                            <div className="form-group">
                                <label>Initial Guest List (Optional)</label>
                                <div className="predefined-guests-list" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
                                    {formData.predefinedGuests?.map((guest) => (
                                        <div key={guest.id} className="guest-mini-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, fontSize: 14 }}>{guest.name}</span>
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{guest.phone}</span>
                                            </div>
                                            <button type="button" onClick={() => removePredefinedGuest(guest.id)} style={{ color: 'var(--error)', background: 'none', border: 'none', padding: 5 }}>
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button type="button" className="action-btn-secondary" style={{ flex: 1, borderStyle: 'dashed' }} onClick={() => setShowGuestModal(true)}>
                                        <i className="fas fa-plus"></i> Add Person
                                    </button>
                                    <button type="button" className="action-btn-primary" style={{ flex: 1 }} onClick={() => setShowFriendsPicker(true)}>
                                        <i className="fas fa-user-friends"></i> Friends
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Guestlist for</label>
                                <div className="checkbox-group">
                                    <label className="checkbox-item">
                                        <input type="checkbox" value="couples" checked={formData.entryType?.includes('couples')} onChange={handleCheckboxChange} />
                                        <span className="checkbox-label">Couples</span>
                                    </label>
                                    <label className="checkbox-item">
                                        <input type="checkbox" value="male" checked={formData.entryType?.includes('male')} onChange={handleCheckboxChange} />
                                        <span className="checkbox-label">Male Stags</span>
                                    </label>
                                    <label className="checkbox-item">
                                        <input type="checkbox" value="female" checked={formData.entryType?.includes('female')} onChange={handleCheckboxChange} />
                                        <span className="checkbox-label">Female Stags</span>
                                    </label>
                                </div>
                            </div>

                            {editId && (
                                <div style={{ marginTop: 32 }}>
                                    <div className="form-group" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>Live Status</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Making a list live makes it visible.</span>
                                        </div>
                                        <label className="toggle-switch">
                                            <input type="checkbox" id="live" checked={formData.live} onChange={handleToggleChange} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>

                                    <button type="button" onClick={handleDelete} className="danger-btn-outline full-width-btn" style={{ marginTop: 24 }}>
                                        <i className="fas fa-trash"></i> Delete Guestlist
                                    </button>
                                </div>
                            )}
                        </form>
                        <div style={{ height: 100 }}></div>
                    </div>

                    <div className="fixed-bottom-action">
                        <button type="submit" form="createListForm" className="primary-btn" disabled={loading}>
                            {loading ? 'Loading...' : 'Preview Guestlist'}
                        </button>
                    </div>
                </>
            )}

            {toast.show && (
                <div className={`toast-notification ${toast.type}`}>
                    <div className="toast-content">
                        <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {confirmModal.show && (
                <div className="modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-header">
                            <h3>{confirmModal.title}</h3>
                        </div>
                        <div className="modal-body">
                            <p>{confirmModal.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="secondary-btn" onClick={closeConfirm} disabled={loading}>Cancel</button>
                            <button type="button" className="danger-btn" onClick={confirmModal.onConfirm} disabled={loading}>
                                {loading ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showGuestModal && (
                <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease' }}>
                    <div className="custom-modal" style={{ maxWidth: 420, animation: 'slideUp 0.3s ease' }}>
                        <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Add Guest to Event</h3>
                            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>Guests added here will be invited automatically</p>
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
                                        setShowGuestModal(false);
                                        setManualGuest({ name: '', phone: '', email: '', gender: 'male' });
                                    }}
                                    style={{ flex: 1, height: 48, fontSize: 15, fontWeight: 600 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="primary-btn"
                                    disabled={!manualGuest.name || !manualGuest.phone}
                                    style={{ flex: 1, height: 48, fontSize: 15, fontWeight: 600 }}
                                >
                                    Add to Guestlist
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
                                    <p style={{ textAlign: 'center', padding: '20px 0' }}>No friends found</p>
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
                                                onChange={() => handleFriendSelect(friend.id)}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{friend.name}</div>
                                                <div style={{ fontSize: 12, color: '#888' }}>{friend.phone || friend.email}</div>
                                            </div>
                                            {friend.linkedUid && <span style={{ fontSize: 10, color: 'var(--success)' }}>✓</span>}
                                        </label>
                                    ))
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="secondary-btn" style={{ flex: 1 }} onClick={() => setShowFriendsPicker(false)}>Cancel</button>
                                <button className="primary-btn" style={{ flex: 2 }} onClick={handleConfirmFriends} disabled={selectedFriends.length === 0}>
                                    Add {selectedFriends.length} Selected
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
