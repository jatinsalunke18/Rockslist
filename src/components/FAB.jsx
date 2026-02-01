import React from 'react';

export default function FAB({ icon = 'fa-plus', onClick, className = '' }) {
    return (
        <button className={`fab-btn ${className}`} onClick={onClick}>
            <i className={`fas ${icon}`}></i>
        </button>
    );
}
