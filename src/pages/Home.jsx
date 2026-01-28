import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default function Home() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [allFetchedEvents, setAllFetchedEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedState, setSelectedState] = useState(localStorage.getItem('preferredState') || 'All Regions');
    const [selectedCity, setSelectedCity] = useState(localStorage.getItem('preferredCity') || 'All Cities');
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [pickerStep, setPickerStep] = useState('state'); // 'state' or 'city'
    const [locationSearch, setLocationSearch] = useState('');

    // Dynamic hierarchy derived from data
    const [locationHierarchy, setLocationHierarchy] = useState({ 'All Regions': ['All Cities'] });

    const cityToStateMap = {
        'Mumbai': 'Maharashtra', 'Pune': 'Maharashtra', 'Nagpur': 'Maharashtra', 'Nashik': 'Maharashtra',
        'Bangalore': 'Karnataka', 'Bengaluru': 'Karnataka', 'Mangalore': 'Karnataka',
        'Delhi': 'Delhi NCR', 'New Delhi': 'Delhi NCR', 'Noida': 'Delhi NCR', 'Gurgaon': 'Delhi NCR', 'Gurugram': 'Delhi NCR',
        'Hyderabad': 'Telangana',
        'Goa': 'Goa', 'North Goa': 'Goa', 'South Goa': 'Goa',
        'Chennai': 'Tamil Nadu',
        'Kolkata': 'West Bengal',
        'Ahmedabad': 'Gujarat', 'Surat': 'Gujarat',
        'Jaipur': 'Rajasthan', 'Udaipur': 'Rajasthan'
    };

    useEffect(() => {
        const fetchEvents = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, "lists"),
                    orderBy("date", "asc"),
                    limit(200)
                );

                const querySnapshot = await getDocs(q);
                const eventsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setAllFetchedEvents(eventsList);

                // Build hierarchy from data
                const hierarchy = { 'All Regions': ['All Cities'] };

                eventsList.forEach(e => {
                    const city = e.city?.trim();
                    if (!city) return;

                    const state = e.state?.trim() || cityToStateMap[city] || 'Other';

                    if (!hierarchy[state]) hierarchy[state] = ['All Cities'];
                    if (!hierarchy[state].includes(city)) hierarchy[state].push(city);

                    // Add to All Regions
                    if (!hierarchy['All Regions'].includes(city)) hierarchy['All Regions'].push(city);
                });

                // Sort hierarchy
                const sortedHierarchy = {};
                Object.keys(hierarchy).sort((a, b) => {
                    if (a === 'All Regions') return -1;
                    if (b === 'All Regions') return 1;
                    return a.localeCompare(b);
                }).forEach(state => {
                    sortedHierarchy[state] = hierarchy[state].sort((a, b) => {
                        if (a === 'All Cities') return -1;
                        return a.localeCompare(b);
                    });
                });

                setLocationHierarchy(sortedHierarchy);
                filterAndSetEvents(eventsList, selectedState, selectedCity);

            } catch (err) {
                console.error("Error fetching events:", err);
                const snap = await getDocs(query(collection(db, "lists"), limit(100)));
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllFetchedEvents(all);
                filterAndSetEvents(all, selectedState, selectedCity);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    // Effect for filtering when location changes
    useEffect(() => {
        filterAndSetEvents(allFetchedEvents, selectedState, selectedCity);
        localStorage.setItem('preferredState', selectedState);
        localStorage.setItem('preferredCity', selectedCity);
    }, [selectedState, selectedCity, allFetchedEvents]);

    const filterAndSetEvents = (all, state, city) => {
        if (!all || all.length === 0) return;

        let filtered = all;

        // Filter by state if not All Regions
        if (state !== 'All Regions') {
            filtered = filtered.filter(e => {
                const eState = e.state?.trim() || cityToStateMap[e.city?.trim()] || 'Other';
                return eState === state;
            });
        }

        // Filter by city if not All Cities
        if (city !== 'All Cities') {
            filtered = filtered.filter(e => e.city?.trim().toLowerCase() === city.toLowerCase());
        }

        setEvents(filtered);
    };

    const handleStateSelect = (state) => {
        setSelectedState(state);
        if (state === 'All Regions') {
            setSelectedCity('All Cities');
            setShowLocationPicker(false);
        } else {
            setPickerStep('city');
        }
    };

    const handleCitySelect = (city) => {
        setSelectedCity(city);
        setShowLocationPicker(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return { day: '?', month: '???' };
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return { day: '?', month: '???' };
        return {
            day: date.getDate(),
            month: date.toLocaleString('default', { month: 'short' }),
            full: date.toDateString()
        };
    };

    const getEventStatus = (event) => {
        if (!event.closeTime || !event.date) return null;

        const now = new Date();
        const eventDate = new Date(event.date);
        const [hours, minutes] = event.closeTime.split(':');
        const closeDateTime = new Date(eventDate);
        closeDateTime.setHours(parseInt(hours), parseInt(minutes));

        const hoursUntilClose = (closeDateTime - now) / (1000 * 60 * 60);

        if (hoursUntilClose < 0) return { text: 'Closed', color: 'var(--text-muted)' };
        if (hoursUntilClose <= 1) return { text: `Closing soon (${event.closeTime})`, color: '#FF9500' };
        return { text: `Open till ${event.closeTime}`, color: 'var(--text-muted)' };
    };

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <span className="logo-text-medium">Rocks Guestlist</span>
                </div>
                <div className="header-center">
                    <div className="location-pill" onClick={() => { setPickerStep('state'); setShowLocationPicker(true); }}>
                        <span>{selectedCity === 'All Cities' ? selectedState : selectedCity}</span>
                        <i className="fas fa-chevron-down"></i>
                    </div>
                </div>
                <div className="header-right">
                    <div className="profile-icon-header" onClick={() => navigate('/profile')}>
                        <i className="fas fa-user-circle"></i>
                    </div>
                </div>
            </header>

            <div className="screen-content">
                <div className="greeting-card glass-card">
                    <h2>hey <span>{user?.displayName || user?.phoneNumber || 'User'}</span>,</h2>
                    <p>you can go for <span className="highlight-count">{events.length}</span> parties today for free in <span>{selectedCity === 'All Cities' ? selectedState : selectedCity}</span></p>
                </div>

                <div className="section-header" style={{ marginBottom: 16 }}>
                    <h3>Trending Guestlists</h3>
                </div>

                <div className="events-stack-list">
                    {loading ? (
                        <p style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
                    ) : events.length === 0 ? (
                        <div className="empty-state">
                            <i className="fas fa-calendar-times"></i>
                            <p>No upcoming events found.</p>
                        </div>
                    ) : (
                        events.map(event => {
                            const { day, month } = formatDate(event.date);
                            const status = getEventStatus(event);
                            return (
                                <div key={event.id} className="event-card-home" onClick={() => navigate(`/event/${event.id}`)}>
                                    <div className="event-card-img-wrapper">
                                        <img src={event.flyerUrl || "https://placehold.co/600x400/EEE/DDD/png"} alt={event.name} className="event-card-img" loading="lazy" />
                                        <div className="event-card-gradient"></div>
                                        <div className="card-overlay-badge">
                                            <span className="month">{month}</span>
                                            <span className="day">{day}</span>
                                        </div>
                                    </div>
                                    <div className="event-card-info">
                                        <h3 className="event-card-title">{event.name || event.eventName || 'Unnamed Event'}</h3>
                                        <div className="event-card-location">
                                            <i className="fas fa-map-marker-alt"></i>
                                            <span>{event.location}{event.city ? `, ${event.city}` : ''}{event.state ? `, ${event.state}` : ''}</span>
                                            {status && (
                                                <>
                                                    <span className="event-meta-separator">·</span>
                                                    <span className="event-status-text" style={{ color: status.color }}>{status.text}</span>
                                                </>
                                            )}
                                        </div>
                                        {event.entryType && event.entryType.length > 0 && (
                                            <div className="event-card-chips">
                                                {event.entryType.map((type, idx) => (
                                                    <span key={idx} className="event-chip">{type}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            <button className="fab-btn" onClick={() => navigate('/create')}>
                <i className="fas fa-plus"></i>
            </button>

            {/* Location Picker Action Sheet */}
            {showLocationPicker && (
                <>
                    <div className="action-sheet-overlay" onClick={() => setShowLocationPicker(false)}></div>
                    <div className="action-sheet">
                        <div className="action-sheet-handle"></div>
                        <div className="action-sheet-content">
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 12 }}>
                                {pickerStep === 'city' && (
                                    <button className="icon-btn-plain" onClick={() => setPickerStep('state')} style={{ padding: 0 }}>
                                        <i className="fas fa-arrow-left"></i>
                                    </button>
                                )}
                                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                                    {pickerStep === 'state' ? 'Select Region' : `Select City in ${selectedState}`}
                                </h3>
                            </div>

                            <div className="search-bar glass-card" style={{ marginBottom: 20, padding: '10px 16px', borderRadius: 12, background: 'var(--surface-light)', border: '1px solid var(--border)' }}>
                                <i className="fas fa-search" style={{ color: 'var(--text-muted)', marginRight: 10 }}></i>
                                <input
                                    type="text"
                                    placeholder={pickerStep === 'state' ? "Search state..." : "Search city..."}
                                    value={locationSearch}
                                    onChange={(e) => setLocationSearch(e.target.value)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: 14 }}
                                />
                            </div>

                            <div className="location-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24, maxHeight: '60vh', overflowY: 'auto', padding: '4px' }}>
                                {pickerStep === 'state' ? (
                                    Object.keys(locationHierarchy)
                                        .filter(s => s.toLowerCase().includes(locationSearch.toLowerCase()))
                                        .map(state => (
                                            <button
                                                key={state}
                                                className={`location-select-btn ${selectedState === state ? 'active' : ''}`}
                                                onClick={() => { handleStateSelect(state); setLocationSearch(''); }}
                                                style={{
                                                    padding: '16px 12px',
                                                    borderRadius: 12,
                                                    border: `1.5px solid ${selectedState === state ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: selectedState === state ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                                                    color: selectedState === state ? 'var(--primary)' : 'var(--text-main)',
                                                    fontWeight: 600,
                                                    fontSize: '14px',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {state}
                                            </button>
                                        ))
                                ) : (
                                    locationHierarchy[selectedState]?.filter(c => c.toLowerCase().includes(locationSearch.toLowerCase()))
                                        .map(city => (
                                            <button
                                                key={city}
                                                className={`location-select-btn ${selectedCity === city ? 'active' : ''}`}
                                                onClick={() => { handleCitySelect(city); setLocationSearch(''); }}
                                                style={{
                                                    padding: '16px 12px',
                                                    borderRadius: 12,
                                                    border: `1.5px solid ${selectedCity === city ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: selectedCity === city ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                                                    color: selectedCity === city ? 'var(--primary)' : 'var(--text-main)',
                                                    fontWeight: 600,
                                                    fontSize: '14px',
                                                    textAlign: 'center',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                {city}
                                            </button>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    );
}
