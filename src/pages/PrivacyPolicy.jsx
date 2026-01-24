import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">Privacy Policy</span>
                </div>
                <div className="header-right"></div>
            </header>
            <div className="screen-content padding-x" style={{ paddingTop: 20, paddingBottom: 40 }}>
                <h3 style={{ marginBottom: 16 }}>Privacy Policy</h3>
                <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
                    Your privacy is important to us. This privacy policy explains how we collect, use, and protect your personal information.
                </p>
                <h3 style={{ marginBottom: 12, fontSize: 16 }}>Information We Collect</h3>
                <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
                    We collect information you provide directly to us, including your name, email address, phone number, and event preferences.
                </p>
                <h3 style={{ marginBottom: 12, fontSize: 16 }}>How We Use Your Information</h3>
                <p style={{ marginBottom: 16, lineHeight: 1.6 }}>
                    We use the information we collect to provide, maintain, and improve our services, and to communicate with you about events and updates.
                </p>
            </div>
        </section>
    );
}
