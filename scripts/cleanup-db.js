import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
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

async function clearCollections() {
    console.log("🚀 Starting fresh: Cleaning up Firestore collections...\n");

    const rootCollections = ["users", "lists", "notifications"];

    for (const collName of rootCollections) {
        console.log(`🧹 Cleaning collection: ${collName}`);
        try {
            const querySnapshot = await getDocs(collection(db, collName));
            console.log(`   Found ${querySnapshot.size} root documents.`);

            for (const docSnap of querySnapshot.docs) {
                // Delete Subcollections first
                if (collName === 'lists') {
                    const rsvps = await getDocs(collection(db, `${collName}/${docSnap.id}/rsvps`));
                    for (const rsvp of rsvps.docs) await deleteDoc(rsvp.ref);
                    if (rsvps.size > 0) console.log(`      🗑️ Deleted ${rsvps.size} RSVPs for event ${docSnap.id}`);
                }

                if (collName === 'users') {
                    const friends = await getDocs(collection(db, `${collName}/${docSnap.id}/friends`));
                    for (const friend of friends.docs) await deleteDoc(friend.ref);
                    if (friends.size > 0) console.log(`      🗑️ Deleted ${friends.size} friends for user ${docSnap.id}`);
                }

                // Delete Root Doc
                await deleteDoc(docSnap.ref);
            }

            console.log(`   ✅ Finished clearing ${collName}`);
        } catch (error) {
            console.error(`   ❌ Error clearing ${collName}:`, error.message);
        }
    }

    console.log("\n✨ Cleanup process finished. Your Firebase project is now ready for fresh entries.");
    process.exit(0);
}

clearCollections();
