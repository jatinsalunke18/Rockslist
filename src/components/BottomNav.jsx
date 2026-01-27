import { NavLink, useLocation } from 'react-router-dom';

export default function BottomNav() {
    const location = useLocation();
    const hideOnPaths = ['/profile', '/preview'];
    
    if (hideOnPaths.includes(location.pathname)) return null;

    return (
        <div className="bottom-nav-container">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-compass"></i>
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-search"></i>
            </NavLink>
            <NavLink to="/lists" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <i className="fas fa-ticket-alt"></i>
            </NavLink>
        </div>
    );
}
