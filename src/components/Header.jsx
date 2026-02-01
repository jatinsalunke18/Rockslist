import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Header({
    left,
    center,
    right,
    title,
    showBack = false,
    sticky = true,
    className = ''
}) {
    const navigate = useNavigate();

    return (
        <header className={`home-header ${sticky ? 'sticky-header' : ''} ${className}`}>
            <div className="header-left">
                {left ? left : (
                    showBack && (
                        <button className="icon-btn-plain" onClick={() => navigate(-1)}>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                    )
                )}
            </div>
            <div className="header-center">
                {center ? center : (
                    <span className="logo-text-medium">{title}</span>
                )}
            </div>
            <div className="header-right">
                {right}
            </div>
        </header>
    );
}
