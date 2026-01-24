// Script to fix empty flyerUrl fields in Firestore
// Run this once to update all existing events with a placeholder image

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&h=1000&fit=crop";

async function fixEmptyFlyers() {
    console.log("🔍 Checking for events with empty flyerUrl...\n");

    try {
        const listsRef = collection(db, "lists");
        const querySnapshot = await getDocs(listsRef);

        let updatedCount = 0;
        let totalCount = querySnapshot.size;

        console.log(`📊 Found ${totalCount} total events`);

        for (const docSnap of querySnapshot.docs) {
            const data = docSnap.data();
            const currentFlyerUrl = data.flyerUrl;

            // Check if flyerUrl is empty, null, undefined, or just whitespace
            if (!currentFlyerUrl || currentFlyerUrl.trim() === '') {
                console.log(`📝 Updating event: ${data.name || docSnap.id}`);

                const docRef = doc(db, "lists", docSnap.id);
                await updateDoc(docRef, {
                    flyerUrl: PLACEHOLDER_IMAGE
                });

                updatedCount++;
            }
        }

        console.log(`\n✅ Update complete!`);
        console.log(`   Updated: ${updatedCount} events`);
        console.log(`   Skipped: ${totalCount - updatedCount} events (already had images)`);

        process.exit(0);
    } catch (error) {
        console.error("❌ Error updating events:", error);
        process.exit(1);
    }
}

// Run the script
fixEmptyFlyers();
