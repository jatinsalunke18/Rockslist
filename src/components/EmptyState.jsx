import React from 'react';

export default function EmptyState({ icon, title, description, children }) {
    return (
        <div className="empty-state">
            {icon && <i className={`fas ${icon}`}></i>}
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
            {children}
        </div>
    );
}
