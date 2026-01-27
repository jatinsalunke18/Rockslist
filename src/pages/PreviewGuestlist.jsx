import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, setDoc, serverTimestamp, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { uploadToCloudinary } from '../lib/cloudinary';
import { createRSVP } from '../lib/rsvpHelper';

export default function PreviewGuestlist() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [publishing, setPublishing] = useState(false);
    const [publishStatus, setPublishStatus] = useState('');

    const { formData, flyer, previewUrl, currentFlyerUrl, editId } = location.state || {};

    useEffect(() => {
        if (!formData) {
            console.error('PreviewGuestlist: No formData in location.state');
            navigate('/create', { replace: true });
        }
    }, [formData, navigate]);

    if (!formData) {
        return (
            <section className="screen active">
                <div className="screen-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <p>Loading preview...</p>
                </div>
            </section>
        );
    }

    const maxAttendees = parseInt(formData.maxAttendees) || 100;
    const displayFlyerUrl = previewUrl || currentFlyerUrl || "https://via.placeholder.com/400x500";

    const handleEdit = () => {
        navigate('/create' + (editId ? `?edit=${editId}` : ''), {
            state: { formData, flyer, previewUrl, currentFlyerUrl }
        });
    };

    const handlePublish = async () => {
        if (!user) return;
        setPublishing(true);
        setPublishStatus('Uploading Flyer...');

        try {
            let flyerUrlToSave = currentFlyerUrl;

            if (!flyerUrlToSave && !flyer) {
                flyerUrlToSave = `https://placehold.co/800x1000/6366f1/ffffff/png?text=No+Image&font=roboto`;
            }

            if (flyer) {
                try {
                    // Try Cloudinary first
                    try {
                        flyerUrlToSave = await uploadToCloudinary(flyer);
                    } catch (cloudinaryErr) {
                        console.warn("Cloudinary upload failed, falling back to Firebase/Placeholder", cloudinaryErr);

                        // Fallback to Firebase if Cloudinary fails (e.g. not configured yet)
                        const storageRef = ref(storage, `flyers/${Date.now()}_${flyer.name}`);

                        // Race the upload against a 15-second timeout
                        const uploadPromise = uploadBytes(storageRef, flyer);
                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Upload timed out')), 15000)
                        );

                        const snapshot = await Promise.race([uploadPromise, timeoutPromise]);
                        flyerUrlToSave = await getDownloadURL(snapshot.ref);
                    }
                } catch (storageErr) {
                    console.error("Storage Error or Timeout:", storageErr);
                    // Use a placeholder if upload fails but don't stop the publishing
                    flyerUrlToSave = `https://placehold.co/800x1000/6366f1/ffffff/png?text=Upload+Skipped&font=roboto`;

                    if (storageErr.message === 'Upload timed out') {
                        setPublishStatus('Upload slow via network. Skipping image...');
                        await new Promise(r => setTimeout(r, 1000));
                    }
                }
            }

            setPublishStatus('Saving Event...');

            const { predefinedGuests, ...restFormData } = formData;

            const eventData = {
                ...restFormData,
                flyerUrl: flyerUrlToSave,
                updatedAt: new Date()
            };

            let finalEventId = editId;

            if (editId) {
                const eventRef = doc(db, "lists", editId);
                if (predefinedGuests && predefinedGuests.length > 0) {
                    eventData.attendeesCount = increment(predefinedGuests.length);
                }
                await updateDoc(eventRef, eventData);
            } else {
                eventData.createdBy = user.uid;
                eventData.createdAt = new Date();
                eventData.live = true;
                eventData.attendeesCount = predefinedGuests?.length || 0;
                eventData.joinedUserIds = [];
                const docRef = await addDoc(collection(db, "lists"), eventData);
                finalEventId = docRef.id;
            }

            // Handle Predefined Guests (Parallel Processing for Speed)
            if (predefinedGuests && predefinedGuests.length > 0 && finalEventId) {
                setPublishStatus(`Adding ${predefinedGuests.length} Guests...`);
                
                const guestPromises = predefinedGuests.map(async (guest) => {
                    const cleanGuest = {
                        name: guest.name,
                        phone: guest.phone.startsWith('+91') ? guest.phone : '+91' + guest.phone.replace(/[^0-9]/g, ''),
                        email: guest.email?.toLowerCase() || null,
                        gender: guest.gender,
                        rsvpTime: new Date().toISOString()
                    };

                    // Use centralized RSVP helper (includes email sending)
                    const rsvpPromise = createRSVP({
                        eventId: finalEventId,
                        userId: user.uid,
                        guests: [cleanGuest],
                        eventData: {
                            name: eventData.name || restFormData.name,
                            date: eventData.date || restFormData.date,
                            time: eventData.time || restFormData.time,
                            location: eventData.location || restFormData.location,
                            city: eventData.city || restFormData.city
                        },
                        addedBy: 'organizer'
                    });

                    // AUTO-SAVE TO FRIENDS (exclude self)
                    const friendId = cleanGuest.email || cleanGuest.phone;
                    if (friendId) {
                        const isSelf = cleanGuest.email?.toLowerCase() === user.email?.toLowerCase() ||
                                      cleanGuest.phone?.replace(/[^0-9]/g, '') === user.phoneNumber?.replace(/[^0-9]/g, '');
                        if (!isSelf) {
                            const friendPromise = setDoc(doc(db, `users/${user.uid}/friends`, friendId), {
                                name: cleanGuest.name,
                                email: cleanGuest.email || null,
                                phone: cleanGuest.phone || null,
                                gender: cleanGuest.gender,
                                addedAt: serverTimestamp()
                            }, { merge: true });
                            return Promise.all([rsvpPromise, friendPromise]);
                        }
                    }
                    return rsvpPromise;
                });

                await Promise.all(guestPromises);
            }

            navigate('/', { state: { published: true } });
        } catch (error) {
            console.error("Publish Failed:", error);
            alert(`Error: ${error.message}`);
            setPublishing(false);
        }
    };

    return (
        <section className="screen active">
            <header className="event-details-header">
                <button className="icon-btn-plain" onClick={handleEdit}><i className="fas fa-arrow-left"></i></button>
                <div className="header-actions" style={{ display: 'flex', gap: 12 }}>
                    <div className="preview-mode-badge">
                        <i className="fas fa-eye"></i>
                        <span>PREVIEW</span>
                    </div>
                </div>
            </header>

            <div className="event-details-scroll">
                <div className="event-flyer-section">
                    <img src={displayFlyerUrl} alt="Event Flyer" className="event-flyer-img" />
                </div>

                <div className="event-info-section">
                    <h1 className="event-title">{formData.name}</h1>

                    <div className="event-meta-row">
                        <i className="fas fa-map-marker-alt"></i>
                        <span>{formData.location}</span>
                    </div>
                    <div className="event-meta-row">
                        <i className="fas fa-calendar-alt"></i>
                        <span>{formData.date} • {formData.time}</span>
                    </div>

                    <div className="event-info-card">
                        <div className="info-card-row">
                            <div className="info-item">
                                <span className="info-label">Lists for</span>
                                <span className="info-value">{formData.entryType?.join(', ') || 'Everyone'}</span>
                            </div>
                            <div className="info-item">
                                <span className="info-label">Closes at</span>
                                <span className="info-value">{formData.closeTime}</span>
                            </div>
                        </div>
                        <div className="capacity-section">
                            <div className="capacity-header">
                                <span className="capacity-label">Capacity</span>
                                <span className="capacity-count">0 / {maxAttendees}</span>
                            </div>
                            <div className="capacity-bar">
                                <div className="capacity-fill" style={{ width: '0%' }}></div>
                            </div>
                        </div>
                    </div>

                    {formData.description && (
                        <div className="event-description">
                            <h3>Description</h3>
                            <p>{formData.description}</p>
                        </div>
                    )}

                    {formData.perks && (
                        <div className="event-perks">
                            <h3>Perks</h3>
                            <p>{formData.perks}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="event-bottom-actions">
                <button className="action-btn-secondary" onClick={handleEdit}>
                    <i className="fas fa-edit"></i>
                    Edit
                </button>
                <button className="action-btn-primary" onClick={handlePublish} disabled={publishing}>
                    {publishing ? publishStatus : editId ? 'Save Changes' : 'Publish'}
                </button>
            </div>
        </section>
    );
}
