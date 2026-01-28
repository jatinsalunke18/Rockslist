import { createContext, useContext, useEffect, useState } from "react";
import {
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    RecaptchaVerifier,
    signInWithPhoneNumber
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { collection, query, where, getDocs, writeBatch, doc, onSnapshot, getDoc, setDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(() => {
        // Fast-path: Check if user was logged in previously
        return !localStorage.getItem('lastKnownUser');
    });

    const linkFriendsOnLogin = async (currentUser) => {
        // Optimized: Uses collectionGroup to find all friend entries across the DB in one request
        if (!currentUser?.email && !currentUser?.phoneNumber) return;

        try {
            const email = currentUser.email?.toLowerCase();
            const phone = currentUser.phoneNumber;
            const batch = writeBatch(db);
            let updateCount = 0;

            // Find all friend docs matching this user's email or phone using collectionGroup
            // Note: Requires a collectionGroup index in Firebase, but fallback works too
            const friendsGroupRef = collectionGroup(db, "friends");

            const queries = [];
            if (email) queries.push(query(friendsGroupRef, where("email", "==", email)));
            if (phone) queries.push(query(friendsGroupRef, where("phone", "==", phone)));

            for (const q of queries) {
                const snapshot = await getDocs(q);
                snapshot.docs.forEach(doc => {
                    if (!doc.data().linkedUid) {
                        batch.update(doc.ref, { linkedUid: currentUser.uid });
                        updateCount++;
                    }
                });
            }

            if (updateCount > 0) {
                await batch.commit();
                console.log(`Linked ${updateCount} past guestlist invites to your account.`);
            }
        } catch (err) {
            console.warn("Friend linking skipped (Normal if index is building):", err.message);
        }
    };

    useEffect(() => {
        let unsubscribeProfile = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                localStorage.setItem('lastKnownUser', 'true');
                // Background Profile Sync
                const userRef = doc(db, "users", currentUser.uid);

                // 1. Setup real-time listener immediately (non-blocking)
                unsubscribeProfile = onSnapshot(userRef, (doc) => {
                    if (doc.exists()) {
                        setProfile(doc.data());
                    } else {
                        // Create profile if missing (one-time)
                        setDoc(userRef, {
                            uid: currentUser.uid,
                            email: currentUser.email || "",
                            phone: currentUser.phoneNumber || "",
                            name: currentUser.displayName || "",
                            photoURL: currentUser.photoURL || "",
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }, { merge: true });
                    }
                });

                // 2. Run background linking (non-blocking)
                linkFriendsOnLogin(currentUser);
            } else {
                setProfile(null);
                if (unsubscribeProfile) unsubscribeProfile();
                localStorage.removeItem('lastKnownUser');
            }

            // Critical Fix: Set loading false IMMEDIATELY once we know auth existence
            setLoading(false);
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    const loginWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    };

    const logout = () => {
        return signOut(auth);
    };

    const setupRecaptcha = (elementId) => {
        try {
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
            window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved
                },
                'expired-callback': () => {
                    // Response expired. Ask user to solve reCAPTCHA again.
                }
            });
        } catch (err) {
            console.error("Recaptcha Setup Error:", err);
        }
    };

    const clearRecaptcha = () => {
        if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
        }
    };

    const loginWithPhone = (phoneNumber) => {
        const appVerifier = window.recaptchaVerifier;
        return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    };

    const updateProfile = async (data) => {
        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, { ...data, updatedAt: new Date() }, { merge: true });
    };

    const value = {
        user,
        profile,
        loading,
        loginWithGoogle,
        logout,
        setupRecaptcha,
        clearRecaptcha,
        loginWithPhone,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
