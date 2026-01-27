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

    const collectionsToDelete = ["users", "lists"];

    for (const collName of collectionsToDelete) {
        console.log(`🧹 Cleaning collection: ${collName}`);
        try {
            const querySnapshot = await getDocs(collection(db, collName));
            const batch = writeBatch(db);

            console.log(`   Found ${querySnapshot.size} documents to delete.`);

            for (const docSnap of querySnapshot.docs) {
                // If the document has subcollections (like rsvps in lists), we might need more logic
                // For a "fresh start", we mainly care about root documents. 
                // Note: Firestore delete is shallow, but the app usually queries from document IDs.
                batch.delete(docSnap.ref);
            }

            if (querySnapshot.size > 0) {
                await batch.commit();
                console.log(`   ✅ Successfully cleared ${collName}`);
            } else {
                console.log(`   ℹ️ ${collName} was already empty.`);
            }
        } catch (error) {
            console.error(`   ❌ Error clearing ${collName}:`, error.message);
        }
    }

    console.log("\n✨ Cleanup process finished. Your Firebase project is now ready for fresh entries.");
    process.exit(0);
}

clearCollections();
