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
        let unsubscribeProfile = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            
            if (currentUser) {
                // Initial check and auto-creation of basic profile if missing
                const userRef = doc(db, "users", currentUser.uid);
                const userDoc = await getDoc(userRef);
                
                if (!userDoc.exists()) {
                    await setDoc(userRef, {
                        uid: currentUser.uid,
                        email: currentUser.email || "",
                        phone: currentUser.phoneNumber || "",
                        name: currentUser.displayName || "",
                        photoURL: currentUser.photoURL || "",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }, { merge: true });
                }

                // Listen for real-time profile updates
                unsubscribeProfile = onSnapshot(userRef, (doc) => {
                    if (doc.exists()) {
                        setProfile(doc.data());
                    }
                });

                await linkFriendsOnLogin(currentUser);
            } else {
                setProfile(null);
                if (unsubscribeProfile) unsubscribeProfile();
            }
            
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
        loginWithPhone,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
