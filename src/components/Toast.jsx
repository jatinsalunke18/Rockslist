import React from 'react';

export default function Toast({ show, message, type = 'success', onClose }) {
    if (!show) return null;

    return (
        <div className={`toast-notification ${type}`}>
            <div className="toast-content">
                <i className={`fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                <span>{message}</span>
            </div>
        </div>
    );
}
