import React, { useState } from 'react';
import ActionSheet from './ActionSheet';

export default function LocationPicker({
    show,
    onClose,
    selectedState,
    selectedCity,
    onStateSelect,
    onCitySelect,
    locationHierarchy,
    statesWithEvents,
    citiesWithEvents
}) {
    const [pickerStep, setPickerStep] = useState('state');
    const [locationSearch, setLocationSearch] = useState('');

    const handleStateClick = (state) => {
        onStateSelect(state);
        if (state === 'All Regions') {
            onClose();
        } else {
            setPickerStep('city');
        }
    };

    const handleCityClick = (city) => {
        onCitySelect(city);
        onClose();
    };

    return (
        <ActionSheet show={show} onClose={onClose}>
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
                    <>
                        {Object.keys(locationHierarchy)
                            .filter(s => s.toLowerCase().includes(locationSearch.toLowerCase()))
                            .map(state => {
                                const isActive = statesWithEvents.has(state.toLowerCase());
                                return (
                                    <button
                                        key={state}
                                        className={`location-select-btn ${selectedState === state ? 'active' : ''}`}
                                        onClick={() => { handleStateClick(state); setLocationSearch(''); }}
                                        style={{
                                            padding: '16px 12px',
                                            borderRadius: 12,
                                            border: `1.5px solid ${selectedState === state ? 'var(--primary)' : 'var(--border)'}`,
                                            background: selectedState === state ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                                            color: selectedState === state ? 'var(--primary)' : 'var(--text-main)',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            textAlign: 'center',
                                            transition: 'all 0.2s ease',
                                            position: 'relative',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {state}
                                        {isActive && <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--surface)' }}></span>}
                                    </button>
                                );
                            })}
                        {locationSearch.length > 1 && Object.entries(locationHierarchy).map(([state, cities]) => (
                            cities
                                .filter(c => c !== 'All Cities' && c.toLowerCase().includes(locationSearch.toLowerCase()))
                                .map(city => (
                                    <button
                                        key={`${state}-${city}`}
                                        className="location-select-btn"
                                        onClick={() => {
                                            onStateSelect(state);
                                            onCitySelect(city);
                                            onClose();
                                            setLocationSearch('');
                                        }}
                                        style={{
                                            padding: '16px 12px',
                                            borderRadius: 12,
                                            border: '1.5px solid var(--border)',
                                            background: 'var(--surface)',
                                            color: 'var(--text-main)',
                                            fontWeight: 500,
                                            fontSize: '13px',
                                            textAlign: 'center',
                                            position: 'relative',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <span style={{ display: 'block' }}>{city}</span>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{state}</span>
                                    </button>
                                ))
                        ))}
                    </>
                ) : (
                    locationHierarchy[selectedState]?.filter(c => c.toLowerCase().includes(locationSearch.toLowerCase()))
                        .map(city => {
                            const isActive = citiesWithEvents.has(city.toLowerCase());
                            return (
                                <button
                                    key={city}
                                    className={`location-select-btn ${selectedCity === city ? 'active' : ''}`}
                                    onClick={() => { handleCityClick(city); setLocationSearch(''); }}
                                    style={{
                                        padding: '16px 12px',
                                        borderRadius: 12,
                                        border: `1.5px solid ${selectedCity === city ? 'var(--primary)' : 'var(--border)'}`,
                                        background: selectedCity === city ? 'rgba(99, 102, 241, 0.08)' : 'var(--surface)',
                                        color: selectedCity === city ? 'var(--primary)' : 'var(--text-main)',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        textAlign: 'center',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {city}
                                    {isActive && <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: 'var(--success)', borderRadius: '50%', border: '2px solid var(--surface)' }}></span>}
                                </button>
                            );
                        })
                )}
            </div>
            {locationSearch && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: -12 }}>
                    Showing results for "{locationSearch}"
                </p>
            )}
        </ActionSheet>
    );
}
