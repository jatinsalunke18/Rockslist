import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { sendConfirmationEmail } from './emailHelper';

/**
 * Centralized Notification Helper
 * 
 * IMPORTANT: Firebase Spark (free) plan - NO Cloud Functions
 * All notifications are created directly from frontend
 */

/**
 * Creates a notification document in Firestore
 * Non-blocking - failures are logged but don't throw
 * 
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - Receiver's user ID
 * @param {string} params.type - Notification type
 * @param {string} params.title - Short headline
 * @param {string} params.message - Descriptive text
 * @param {string} params.eventId - Related event ID (optional)
 * @returns {Promise<void>}
 */
export async function createNotification({ userId, type, title, message, eventId = null }) {
    try {
        await addDoc(collection(db, 'notifications'), {
            userId,
            type,
            title,
            message,
            eventId,
            read: false,
            createdAt: serverTimestamp() // CRITICAL: Required for ordering
        });
    } catch (error) {
        console.warn('Notification creation failed (non-blocking):', error);
    }
}

/**
 * Creates an RSVP entry with automatic email notification
 * SINGLE SOURCE OF TRUTH for all RSVP creation
 * 
 * @param {Object} params - RSVP parameters
 * @param {string} params.eventId - Event ID
 * @param {string} params.userId - User ID creating the RSVP
 * @param {Array} params.guests - Array of guest objects
 * @param {Object} params.eventData - Event details (name, date, time, location)
 * @param {string} params.addedBy - 'self' | 'organizer'
 * @returns {Promise<string>} - Created RSVP document ID
 */
export async function createRSVP({ eventId, userId, guests, eventData, addedBy = 'self' }) {
    const { collection: firestoreCollection, addDoc: firestoreAddDoc, serverTimestamp: firestoreTimestamp, doc: firestoreDoc, updateDoc: firestoreUpdateDoc, arrayUnion } = await import('firebase/firestore');
    
    try {
        // 1. Create RSVP document
        const rsvpDocRef = await firestoreAddDoc(firestoreCollection(db, `lists/${eventId}/rsvps`), {
            userId,
            eventId,
            guests,
            createdAt: firestoreTimestamp(),
            status: 'confirmed',
            addedBy
        });

        // 2. Update list document with joinedUserIds for efficient queries
        if (addedBy === 'self') {
            try {
                await firestoreUpdateDoc(firestoreDoc(db, 'lists', eventId), {
                    joinedUserIds: arrayUnion(userId)
                });
            } catch (err) {
                console.warn('Failed to update joinedUserIds (non-blocking):', err);
            }
        }

        // 3. Send confirmation emails to all guests (non-blocking, fire-and-forget)
        guests.forEach(guest => {
            if (guest.email) {
                sendConfirmationEmail({
                    event: eventData,
                    guest: { name: guest.name, email: guest.email },
                    addedBy
                }).catch(err => console.warn('Email failed (non-blocking):', err));
            }
        });

        // 4. Create notification only for self-join (non-blocking)
        if (addedBy === 'self') {
            createNotification({
                userId,
                type: 'RSVP_CONFIRMED',
                title: 'RSVP Confirmed! 🎉',
                message: `You've been added to ${eventData.name}. See you on ${eventData.date}!`,
                eventId
            }).catch(err => console.warn('Notification failed (non-blocking):', err));
        }

        return rsvpDocRef.id;
    } catch (error) {
        console.error('RSVP creation failed:', error);
        throw error;
    }
}

/**
 * Notifies user about RSVP edit
 */
export function notifyRSVPEdit(userId, eventId, eventName) {
    return createNotification({
        userId,
        type: 'RSVP_EDITED',
        title: 'RSVP Updated',
        message: `Your RSVP for ${eventName} has been updated.`,
        eventId
    });
}

/**
 * Notifies user about RSVP removal
 */
export function notifyRSVPRemoval(userId, eventId, eventName) {
    return createNotification({
        userId,
        type: 'RSVP_REMOVED',
        title: 'Left Guestlist',
        message: `You've exited the guestlist for ${eventName}.`,
        eventId
    });
}

/**
 * Removes user from joinedUserIds array
 */
export async function removeUserFromJoinedList(eventId, userId) {
    try {
        const { doc: firestoreDoc, updateDoc: firestoreUpdateDoc, arrayRemove } = await import('firebase/firestore');
        await firestoreUpdateDoc(firestoreDoc(db, 'lists', eventId), {
            joinedUserIds: arrayRemove(userId)
        });
    } catch (err) {
        console.warn('Failed to update joinedUserIds (non-blocking):', err);
    }
}

/**
 * Notifies event host about new guest
 */
export function notifyHostNewGuest(hostId, eventId, eventName, guestName) {
    return createNotification({
        userId: hostId,
        type: 'EVENT_ADDED',
        title: 'New Guest! 👥',
        message: `${guestName} joined ${eventName}.`,
        eventId
    });
}
