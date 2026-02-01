import React from 'react';
import ActionSheet from './ActionSheet';

export default function FriendsPicker({
    show,
    onClose,
    friends,
    selectedFriends,
    onSelect,
    onConfirm,
    isSaving = false
}) {
    return (
        <ActionSheet show={show} onClose={onClose} title="Add from Friends">
            <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {friends.length === 0 ? (
                    <p style={{ textAlign: 'center', padding: '20px 0' }}>No friends found</p>
                ) : (
                    friends.map(friend => (
                        <label key={friend.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: 12,
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: selectedFriends.includes(friend.id) ? 'rgba(52, 35, 166, 0.05)' : 'white'
                        }}>
                            <input
                                type="checkbox"
                                checked={selectedFriends.includes(friend.id)}
                                onChange={() => onSelect(friend.id)}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600 }}>{friend.name}</div>
                                <div style={{ fontSize: 12, color: '#888' }}>{friend.phone || friend.email}</div>
                            </div>
                            {friend.linkedUid && <span style={{ fontSize: 10, color: 'var(--success)' }}>✓</span>}
                        </label>
                    ))
                )}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
                <button className="secondary-btn" style={{ flex: 1 }} onClick={onClose} disabled={isSaving}>Cancel</button>
                <button className="primary-btn" style={{ flex: 2 }} onClick={onConfirm} disabled={isSaving || selectedFriends.length === 0}>
                    {isSaving ? 'Adding...' : `Add ${selectedFriends.length} Selected`}
                </button>
            </div>
        </ActionSheet>
    );
}
