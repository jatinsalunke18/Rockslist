import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';

export default function CreateList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editId = searchParams.get('edit');
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        date: '',
        time: '',
        location: '',
        city: '',
        maxAttendees: '',
        closeTime: '',
        ticketLink: '',
        description: '',
        perks: '',
        entryType: [],
        live: true
    });
    const [flyer, setFlyer] = useState(null);
    const [currentFlyerUrl, setCurrentFlyerUrl] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const closeConfirm = () => setConfirmModal({ show: false, title: '', message: '', onConfirm: null });

    useEffect(() => {
        if (editId) {
            setLoading(true);
            const fetchEvent = async () => {
                try {
                    const docRef = doc(db, "lists", editId);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
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
                            live: data.live ?? true
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
            setFormData({
                name: '',
                date: '',
                time: '',
                location: '',
                city: '',
                maxAttendees: '',
                closeTime: '',
                ticketLink: '',
                description: '',
                perks: '',
                entryType: [],
                live: true
            });
            setCurrentFlyerUrl('');
            setPreviewUrl('');
            setFlyer(null);
        }
    }, [editId, navigate]);

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

        setLoading(true);
        try {
            let flyerUrlToSave = currentFlyerUrl;

            if (!flyerUrlToSave && !flyer) {
                flyerUrlToSave = `https://placehold.co/800x1000/6366f1/ffffff/png?text=No+Image&font=roboto`;
            }

            if (flyer) {
                try {
                    const storageRef = ref(storage, `flyers/${Date.now()}_${flyer.name}`);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error("Timeout")), 2000)
                    );
                    const snapshot = await Promise.race([
                        uploadBytes(storageRef, flyer),
                        timeoutPromise
                    ]);
                    flyerUrlToSave = await getDownloadURL(snapshot.ref);
                } catch (storageErr) {
                    const fileName = flyer.name;
                    const encodedFileName = encodeURIComponent(fileName);
                    flyerUrlToSave = `https://placehold.co/800x1000/6366f1/ffffff/png?text=${encodedFileName}&font=roboto`;
                }
            }

            const eventData = {
                ...formData,
                flyerUrl: flyerUrlToSave,
                updatedAt: new Date()
            };

            if (eventData.id) delete eventData.id;

            if (editId) {
                const eventRef = doc(db, "lists", editId);
                await updateDoc(eventRef, eventData);
                showToast("Guestlist updated successfully!", "success");
            } else {
                eventData.createdBy = user.uid;
                eventData.createdAt = new Date();
                eventData.live = true;
                await addDoc(collection(db, "lists"), eventData);
                showToast("Guestlist created successfully!", "success");
            }

            setTimeout(() => navigate('/'), 1000);
        } catch (error) {
            console.error("Submit Failed:", error);
            showToast(`Error: ${error.message}`, "error");
        } finally {
            setLoading(false);
        }
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

            <div className="screen-content padding-x scrollable-form" style={{ paddingTop: 20 }}>
                <form id="createListForm" onSubmit={handleSubmit}>
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
                        <label htmlFor="city">City *</label>
                        <input type="text" id="city" required placeholder="e.g. New York" value={formData.city} onChange={handleChange} />
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
                        <label>Guestlist for</label>
                        <div className="checkbox-group">
                            <label className="selection-chip">
                                <input type="checkbox" value="couples" checked={formData.entryType?.includes('couples')} onChange={handleCheckboxChange} />
                                <span className="chip-label">Couples</span>
                            </label>
                            <label className="selection-chip">
                                <input type="checkbox" value="male" checked={formData.entryType?.includes('male')} onChange={handleCheckboxChange} />
                                <span className="chip-label">Male Stags</span>
                            </label>
                            <label className="selection-chip">
                                <input type="checkbox" value="female" checked={formData.entryType?.includes('female')} onChange={handleCheckboxChange} />
                                <span className="chip-label">Female Stags</span>
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
                    {loading ? 'Saving...' : (editId ? 'Update Access' : 'Create Guestlist')}
                </button>
            </div>

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
        </section>
    );
}
