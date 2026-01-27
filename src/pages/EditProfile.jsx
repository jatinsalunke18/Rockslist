import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function EditProfile() {
    const navigate = useNavigate();
    const { user, profile, updateProfile } = useAuth();
    const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || '',
                email: profile.email || '',
                phone: profile.phone ? profile.phone.replace('+91', '') : ''
            });
        }
    }, [profile]);

    const validateUnique = async (field, value) => {
        const q = query(collection(db, 'users'), where(field, '==', value));
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.filter(doc => doc.id !== user.uid);
        return docs.length === 0;
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const phoneFormatted = formData.phone.replace(/[^0-9]/g, '');
            if (phoneFormatted.length !== 10) {
                alert('Please enter a valid 10-digit phone number');
                setSaving(false);
                return;
            }

            const fullPhone = '+91' + phoneFormatted;
            const normalizedEmail = formData.email.toLowerCase().trim();

            // Uniqueness checks
            const emailUnique = await validateUnique('email', normalizedEmail);
            if (!emailUnique) {
                alert('This email is already linked to another account');
                setSaving(false);
                return;
            }

            const phoneUnique = await validateUnique('phone', fullPhone);
            if (!phoneUnique) {
                alert('This phone number is already linked to another account');
                setSaving(false);
                return;
            }

            await updateProfile({
                name: formData.name,
                phone: fullPhone,
                email: normalizedEmail
            });

            alert('Profile updated successfully!');
            navigate(-1);
        } catch (err) {
            console.error('Error saving profile:', err);
            alert('Failed to save profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

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
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Email Address"
                        disabled={!!user?.email}
                        style={user?.email ? { background: 'var(--background)', cursor: 'not-allowed' } : {}}
                    />
                </div>
                <div className="form-group">
                    <label>Phone</label>
                    <div className="phone-input-group" style={user?.phoneNumber ? { background: 'var(--background)', cursor: 'not-allowed' } : {}}>
                        <span className="country-code">+91</span>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Phone Number"
                            maxLength="10"
                            disabled={!!user?.phoneNumber}
                        />
                    </div>
                </div>
                <button className="primary-btn" style={{ marginTop: 24 }} onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </section>
    );
}
