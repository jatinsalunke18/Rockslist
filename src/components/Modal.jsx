import React from 'react';

export default function Modal({
    show,
    onClose,
    title,
    children,
    footer,
    maxWidth = 420,
    animation = 'slideUp'
}) {
    if (!show) return null;

    return (
        <div className="modal-overlay" onClick={onClose} style={{ animation: 'fadeIn 0.2s ease' }}>
            <div
                className="custom-modal"
                onClick={e => e.stopPropagation()}
                style={{ maxWidth, animation: `${animation} 0.3s ease` }}
            >
                {title && (
                    <div className="modal-header">
                        <h3>{title}</h3>
                    </div>
                )}
                <div className="modal-body">
                    {children}
                </div>
                {footer && (
                    <div className="modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
