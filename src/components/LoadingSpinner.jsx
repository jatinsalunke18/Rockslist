import React from 'react';

export default function LoadingSpinner({ message = 'Loading...', fullScreen = false }) {
    const content = (
        <div className="loading-spinner-container" style={{ textAlign: 'center', padding: 20 }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, color: 'var(--primary)' }}></i>
            <p style={{ color: 'var(--text-muted)' }}>{message}</p>
        </div>
    );

    if (fullScreen) {
        return (
            <div className="screen-content center-msg">
                {content}
            </div>
        );
    }

    return content;
}
