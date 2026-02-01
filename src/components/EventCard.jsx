import React from 'react';

export default function EventCard({
    event,
    variant = 'home',
    onClick,
    status,
    badge
}) {
    const { id, name, eventName, flyerUrl, location, city, state, date, entryType, attendeesCount, maxAttendees } = event;
    const displayName = eventName || name || 'Unnamed Event';

    const formatDate = (dateString) => {
        if (!dateString) return { day: '?', month: '???' };
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return { day: '?', month: '???' };
        return {
            day: d.getDate(),
            month: d.toLocaleString('default', { month: 'short' }),
            full: d.toDateString()
        };
    };

    const { day, month } = formatDate(date);

    if (variant === 'modern') {
        const attendees = attendeesCount || 0;
        const capacity = maxAttendees || 0;

        return (
            <div className="event-card-modern" onClick={onClick}>
                <div className="event-card-image">
                    {flyerUrl ? (
                        <img src={flyerUrl} alt={displayName} loading="lazy" />
                    ) : (
                        <div className="event-card-placeholder" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fas fa-image" style={{ color: 'white', opacity: 0.4, fontSize: '2rem' }}></i>
                        </div>
                    )}
                    {badge && (
                        <div className="event-card-badge" style={{ backgroundColor: badge.color }}>
                            {badge.text}
                        </div>
                    )}
                </div>
                <div className="event-card-content">
                    <h3 className="event-card-title">{displayName}</h3>
                    <div className="event-card-meta">
                        <div className="event-meta-item">
                            <i className="fas fa-calendar-alt"></i>
                            <span>{date}</span>
                        </div>
                        <div className="event-meta-item">
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{location}</span>
                        </div>
                        {capacity > 0 && (
                            <div className="event-meta-item">
                                <i className="fas fa-users"></i>
                                <span>{attendees}/{capacity}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default variant: home
    return (
        <div className="event-card-home" onClick={onClick}>
            <div className="event-card-img-wrapper">
                <img src={flyerUrl || "https://placehold.co/600x400/EEE/DDD/png"} alt={displayName} className="event-card-img" loading="lazy" />
                <div className="event-card-gradient"></div>
                <div className="card-overlay-badge">
                    <span className="month">{month}</span>
                    <span className="day">{day}</span>
                </div>
            </div>
            <div className="event-card-info">
                <h3 className="event-card-title">{displayName}</h3>
                <div className="event-card-location">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{location}{city ? `, ${city}` : ''}{state ? `, ${state}` : ''}</span>
                    {status && (
                        <>
                            <span className="event-meta-separator">·</span>
                            <span className="event-status-text" style={{ color: status.color }}>{status.text}</span>
                        </>
                    )}
                </div>
                {entryType && entryType.length > 0 && (
                    <div className="event-card-chips">
                        {entryType.map((type, idx) => (
                            <span key={idx} className="event-chip">{type}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
