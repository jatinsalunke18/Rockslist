import { useNavigate } from 'react-router-dom';

export default function HelpCenter() {
    const navigate = useNavigate();

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">Help Center</span>
                </div>
                <div className="header-right"></div>
            </header>
            <div className="screen-content padding-x" style={{ paddingTop: 20 }}>
                <div className="menu-card">
                    <button className="menu-item">
                        <i className="fas fa-question-circle"></i>
                        <span>FAQs</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    <button className="menu-item">
                        <i className="fas fa-envelope"></i>
                        <span>Contact Support</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    <button className="menu-item">
                        <i className="fas fa-book"></i>
                        <span>User Guide</span>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
        </section>
    );
}
