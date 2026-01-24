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
import { collection, query, where, getDocs, writeBatch, doc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const linkFriendsOnLogin = async (currentUser) => {
        if (!currentUser?.email) return;
        try {
            const email = currentUser.email.toLowerCase();
            const usersRef = collection(db, "users");
            const usersSnapshot = await getDocs(usersRef);
            
            const batch = writeBatch(db);
            let updateCount = 0;

            for (const userDoc of usersSnapshot.docs) {
                const friendsRef = collection(db, `users/${userDoc.id}/friends`);
                const q = query(friendsRef, where("email", "==", email));
                const friendsSnapshot = await getDocs(q);
                
                friendsSnapshot.docs.forEach(friendDoc => {
                    const friendData = friendDoc.data();
                    if (!friendData.linkedUid) {
                        batch.update(friendDoc.ref, { linkedUid: currentUser.uid });
                        updateCount++;
                    }
                });
            }

            if (updateCount > 0) {
                await batch.commit();
            }
        } catch (err) {
            console.error("Error linking friends:", err);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                await linkFriendsOnLogin(currentUser);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    };

    const logout = () => {
        return signOut(auth);
    };

    const setupRecaptcha = (elementId) => {
        if (!window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
                'size': 'invisible',
                'callback': () => {
                    // reCAPTCHA solved
                }
            });
        }
    };

    const loginWithPhone = (phoneNumber) => {
        const appVerifier = window.recaptchaVerifier;
        return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    };

    const value = {
        user,
        loading,
        loginWithGoogle,
        logout,
        setupRecaptcha,
        loginWithPhone
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
