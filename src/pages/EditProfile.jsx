import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function EditProfile() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};
                setFormData({
                    name: userData.name || user.displayName || '',
                    email: user.email || '',
                    phone: userData.phone || user.phoneNumber?.replace('+91', '') || ''
                });
            } catch (err) {
                console.error('Error fetching user data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const phoneFormatted = formData.phone.replace(/[^0-9]/g, '');
            if (phoneFormatted.length !== 10) {
                alert('Please enter a valid 10-digit phone number');
                setSaving(false);
                return;
            }
            await setDoc(doc(db, 'users', user.uid), {
                name: formData.name,
                phone: '+91' + phoneFormatted,
                email: formData.email,
                updatedAt: new Date()
            }, { merge: true });
            alert('Profile updated successfully!');
            navigate(-1);
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="screen center-msg">Loading...</div>;

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">Edit Profile</span>
                </div>
                <div className="header-right"></div>
            </header>
            <div className="screen-content padding-x" style={{ paddingTop: 20 }}>
                <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter your name" />
                </div>
                <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={formData.email} disabled style={{ background: 'var(--background)', cursor: 'not-allowed' }} />
                </div>
                <div className="form-group">
                    <label>Phone</label>
                    <div className="phone-input-group">
                        <span className="country-code">+91</span>
                        <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone Number" maxLength="10" />
                    </div>
                </div>
                <button className="primary-btn" style={{ marginTop: 24 }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </section>
    );
}
