import { useNavigate } from 'react-router-dom';

export default function Notifications() {
    const navigate = useNavigate();

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">Notifications</span>
                </div>
                <div className="header-right"></div>
            </header>
            <div className="screen-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24 }}>
                <i className="fas fa-bell" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No notifications yet</p>
            </div>
        </section>
    );
}
