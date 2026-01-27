import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Profile() {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;

        const fetchUnreadCount = async () => {
            try {
                const q = query(
                    collection(db, "notifications"),
                    where("userId", "==", user.uid),
                    where("read", "==", false)
                );

                const snapshot = await getDocs(q);
                setUnreadCount(snapshot.size);
            } catch (err) {
                console.error('Failed to fetch unread count:', err);
            }
        };

        fetchUnreadCount();
    }, [user]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">Profile</span>
                </div>
                <div className="header-right"></div>
            </header>
            <div className="screen-content profile-content">
                <div className="profile-header-section">
                    <div className="profile-avatar">
                        {profile?.photoURL ? <img src={profile.photoURL} alt="Avatar" /> : <i className="fas fa-user"></i>}
                    </div>
                    <h3 className="profile-name">{profile?.name || 'User'}</h3>
                    <div className="profile-contact-info">
                        <p className="profile-email">{profile?.email}</p>
                        <p className="profile-phone">{profile?.phone}</p>
                    </div>
                </div>

                <div className="profile-menu-section">
                    <div className="menu-section-title">Account</div>
                    <div className="menu-card">
                        <button className="menu-item" onClick={() => navigate('/edit-profile')}>
                            <i className="fas fa-user-edit"></i>
                            <span>Edit Profile</span>
                            <i className="fas fa-chevron-right"></i>
                        </button>
                        <button className="menu-item" onClick={() => navigate('/friends')}>
                            <i className="fas fa-user-friends"></i>
                            <span>My Friends</span>
                            <i className="fas fa-chevron-right"></i>
                        </button>
                        <button className="menu-item" onClick={() => navigate('/notifications')} style={{ position: 'relative' }}>
                            <i className="fas fa-bell"></i>
                            <span>Notifications</span>
                            {unreadCount > 0 && (
                                <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                            )}
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>

                    <div className="menu-section-title">Support</div>
                    <div className="menu-card">
                        <button className="menu-item" onClick={() => navigate('/help')}>
                            <i className="fas fa-question-circle"></i>
                            <span>Help Center</span>
                            <i className="fas fa-chevron-right"></i>
                        </button>
                        <button className="menu-item" onClick={() => navigate('/privacy')}>
                            <i className="fas fa-shield-alt"></i>
                            <span>Privacy Policy</span>
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>

                    <div className="menu-card" style={{ marginTop: 24 }}>
                        <button className="menu-item menu-item-danger" onClick={handleLogout}>
                            <i className="fas fa-sign-out-alt"></i>
                            <span>Log Out</span>
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
