import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

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
                        {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : <i className="fas fa-user"></i>}
                    </div>
                    <h3 className="profile-name">{user?.displayName || 'User'}</h3>
                    <p className="profile-email">{user?.email || user?.phoneNumber}</p>
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
                        <button className="menu-item" onClick={() => navigate('/notifications')}>
                            <i className="fas fa-bell"></i>
                            <span>Notifications</span>
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
