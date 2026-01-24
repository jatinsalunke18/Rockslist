import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, orderBy, query, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

export default function Friends() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [friendToDelete, setFriendToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchFriends = async () => {
        try {
            const friendsRef = collection(db, `users/${user.uid}/friends`);
            const q = query(friendsRef, orderBy('addedAt', 'desc'));
            const snapshot = await getDocs(q);
            const friendsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setFriends(friendsList);
        } catch (err) {
            console.error('Error fetching friends:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFriends();
    }, [user]);

    const handleDeleteClick = (friend) => {
        setFriendToDelete(friend);
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!friendToDelete) return;
        setDeleting(true);
        try {
            await deleteDoc(doc(db, `users/${user.uid}/friends`, friendToDelete.id));
            setShowDeleteModal(false);
            setFriendToDelete(null);
            await fetchFriends();
        } catch (err) {
            console.error('Error deleting friend:', err);
            alert('Failed to remove friend');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <section className="screen active">
            <header className="home-header sticky-header">
                <div className="header-left">
                    <button className="icon-btn-plain" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i></button>
                </div>
                <div className="header-center">
                    <span className="logo-text-medium">My Friends</span>
                </div>
                <div className="header-right"></div>
            </header>
            <div className="screen-content padding-x" style={{ paddingTop: 20 }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>
                ) : friends.length === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
                        <i className="fas fa-user-friends" style={{ fontSize: 48, color: 'var(--text-muted)', opacity: 0.3 }}></i>
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No friends added yet</p>
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>Friends are automatically saved when you add guests to events</p>
                    </div>
                ) : (
                    <div className="friends-list">
                        {friends.map(friend => (
                            <div key={friend.id} className="friend-card" style={{ padding: 16, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: friend.gender === 'male' ? '#6987C9' : friend.gender === 'female' ? '#EE92C2' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                                        {friend.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            <span style={{ fontWeight: 600, fontSize: 15 }}>{friend.name}</span>
                                            {friend.linkedUid && (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--success)', background: 'rgba(52, 199, 89, 0.1)', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>On Rocklist</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            {friend.email || friend.phone || 'No contact info'}
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeleteClick(friend)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: 8 }}>
                                        <i className="fas fa-trash" style={{ fontSize: 16 }}></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="custom-modal">
                        <div className="modal-header">
                            <h3>Remove Friend</h3>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to remove {friendToDelete?.name} from your friends list?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="secondary-btn" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</button>
                            <button className="danger-btn" onClick={handleDeleteConfirm} disabled={deleting}>
                                {deleting ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
