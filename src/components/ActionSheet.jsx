import React from 'react';

export default function ActionSheet({ show, onClose, title, children }) {
    if (!show) return null;

    return (
        <>
            <div className="action-sheet-overlay" onClick={onClose}></div>
            <div className="action-sheet">
                <div className="action-sheet-handle"></div>
                <div className="action-sheet-content">
                    {title && <h3 className="action-sheet-title">{title}</h3>}
                    {children}
                </div>
            </div>
        </>
    );
}
