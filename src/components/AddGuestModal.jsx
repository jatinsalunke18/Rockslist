import React from 'react';
import Modal from './Modal';

export default function AddGuestModal({
    show,
    onClose,
    onAdd,
    isSaving = false,
    manualGuest,
    setManualGuest,
    title = "Add Guest",
    subtitle = "Guest details"
}) {
    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(e);
    };

    return (
        <Modal
            show={show}
            onClose={onClose}
            title={(
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>{subtitle}</p>
                </div>
            )}
            footer={(
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                    <button
                        type="button"
                        className="secondary-btn"
                        onClick={onClose}
                        disabled={isSaving}
                        style={{ flex: 1, height: 48, fontSize: 15, fontWeight: 600 }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="addGuestForm"
                        className="primary-btn"
                        disabled={isSaving || !manualGuest.name || !manualGuest.phone}
                        style={{ flex: 1, height: 48, fontSize: 15, fontWeight: 600 }}
                    >
                        {isSaving ? (
                            <>
                                <i className="fas fa-spinner fa-spin" style={{ marginRight: 8 }}></i>
                                Adding...
                            </>
                        ) : 'Add Guest'}
                    </button>
                </div>
            )}
        >
            <form id="addGuestForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ position: 'relative' }}>
                    <i className="fas fa-user" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}></i>
                    <input
                        type="text"
                        placeholder="Full Name *"
                        className="common-input"
                        value={manualGuest.name}
                        onChange={(e) => setManualGuest({ ...manualGuest, name: e.target.value })}
                        required
                        style={{ paddingLeft: 40, height: 48, fontSize: 15, borderRadius: 8, width: '100%' }}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <i className="fas fa-phone" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}></i>
                    <input
                        type="tel"
                        placeholder="Phone Number *"
                        className="common-input"
                        value={manualGuest.phone}
                        onChange={(e) => setManualGuest({ ...manualGuest, phone: e.target.value })}
                        required
                        maxLength="10"
                        style={{ paddingLeft: 40, height: 48, fontSize: 15, borderRadius: 8, width: '100%' }}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <i className="fas fa-envelope" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14 }}></i>
                    <input
                        type="email"
                        placeholder="Email (Optional)"
                        className="common-input"
                        value={manualGuest.email}
                        onChange={(e) => setManualGuest({ ...manualGuest, email: e.target.value })}
                        style={{ paddingLeft: 40, height: 48, fontSize: 15, borderRadius: 8, width: '100%' }}
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-main)', marginBottom: 10 }}>Gender</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {['male', 'female', 'other'].map(g => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => setManualGuest({ ...manualGuest, gender: g })}
                                style={{
                                    flex: 1,
                                    padding: '10px 16px',
                                    border: `2px solid ${manualGuest.gender === g ? 'var(--primary)' : 'var(--border)'}`,
                                    borderRadius: 8,
                                    background: manualGuest.gender === g ? 'rgba(52, 35, 166, 0.08)' : 'transparent',
                                    color: manualGuest.gender === g ? 'var(--primary)' : 'var(--text-main)',
                                    fontWeight: manualGuest.gender === g ? 600 : 500,
                                    fontSize: 14,
                                    textTransform: 'capitalize',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            </form>
        </Modal>
    );
}
