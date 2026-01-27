# Centralized RSVP Helper - Implementation Guide

## Overview
All RSVP creation logic has been centralized into a single reusable helper (`rsvpHelper.js`) to ensure consistent email and in-app notification behavior across all flows.

## Why Centralization?

### Problem Before
- RSVP logic was duplicated across multiple screens
- Guests added during event creation didn't receive emails
- Inconsistent notification behavior
- Hard to maintain and debug

### Solution Now
- Single source of truth for RSVP creation
- Consistent email + notification behavior
- Easier to maintain and extend
- Works with Firebase Spark (free) plan

## Architecture

### Firebase Spark Plan Constraints
This app uses Firebase Spark (free) plan:
- ❌ No Cloud Functions available
- ✅ Email sending via Cloud Function trigger (already deployed)
- ✅ Client-side notification creation
- ✅ All RSVP logic in frontend

### How It Works
```
User Action (Join/Add Guest)
    ↓
createRSVP() helper
    ↓
├─→ Write RSVP to Firestore
│   └─→ Cloud Function detects new RSVP
│       └─→ Sends email automatically
│
└─→ Create in-app notification
    └─→ User sees notification in app
```

## Helper Functions

### 1. `createRSVP(params)`
**Purpose**: Creates RSVP with automatic email and notification

**Parameters**:
```javascript
{
  eventId: string,        // Event ID
  userId: string,         // User creating RSVP
  guests: Array,          // Guest objects with name, email, phone, gender
  eventData: Object,      // Event details (name, date, time, location)
  addedBy: string         // 'self' | 'organizer' | 'friend'
}
```

**Returns**: `Promise<string>` - RSVP document ID

**Used By**:
- `Rsvp.jsx` - User joining event
- `PreviewGuestlist.jsx` - Host adding guests during event creation

### 2. `notifyRSVPEdit(userId, eventId, eventName)`
**Purpose**: Creates notification when RSVP is edited

**Used By**:
- `Rsvp.jsx` - Edit mode

### 3. `notifyRSVPRemoval(userId, eventId, eventName)`
**Purpose**: Creates notification when user exits guestlist

**Used By**:
- `EventDetails.jsx` - Exit guestlist action

### 4. `notifyHostNewGuest(hostId, eventId, eventName, guestName)`
**Purpose**: Notifies event host about new guest

**Used By**:
- `Rsvp.jsx` - When non-host joins event

## Email Flow

### Automatic Email Sending
1. `createRSVP()` writes RSVP document to Firestore
2. Cloud Function `sendRsvpNotifications` detects new document
3. Function reads all guests with email addresses
4. Function sends email to each guest
5. Function marks RSVP as `emailSent: true`

**Important**: Email sending is handled by Cloud Function, NOT client-side.
The helper just creates the RSVP document, and the Cloud Function does the rest.

## Notification Flow

### In-App Notifications
1. `createRSVP()` creates notification documents
2. Notifications written to `notifications` collection
3. Real-time listeners update UI instantly
4. User sees notification in Notifications screen

## Usage Examples

### Example 1: User Joining Event
```javascript
// In Rsvp.jsx
await createRSVP({
  eventId: id,
  userId: user.uid,
  guests: cleanGuests,
  eventData: {
    name: event.name,
    date: event.date,
    time: event.time,
    location: event.location
  },
  addedBy: 'self'
});
```

### Example 2: Host Adding Guests During Event Creation
```javascript
// In PreviewGuestlist.jsx
await createRSVP({
  eventId: finalEventId,
  userId: user.uid,
  guests: [cleanGuest],
  eventData: {
    name: eventData.name,
    date: eventData.date,
    time: eventData.time,
    location: eventData.location
  },
  addedBy: 'organizer'
});
```

### Example 3: Editing RSVP
```javascript
// In Rsvp.jsx
await updateDoc(rsvpRef, { guests: cleanGuests });
await notifyRSVPEdit(user.uid, eventId, eventName);
```

### Example 4: Exiting Guestlist
```javascript
// In EventDetails.jsx
await deleteDoc(rsvpRef);
await notifyRSVPRemoval(user.uid, eventId, eventName);
```

## Benefits

### ✅ Consistency
- All RSVPs follow same flow
- No missing emails or notifications
- Predictable behavior

### ✅ Maintainability
- Single place to update RSVP logic
- Easy to add new features
- Clear separation of concerns

### ✅ Reliability
- Non-blocking email/notification creation
- Graceful error handling
- RSVP succeeds even if notifications fail

### ✅ Spark Plan Compatible
- No Cloud Functions needed for RSVP creation
- Uses existing Cloud Function for emails
- Client-side notification creation

## Testing Checklist

- [ ] User joins event → receives email + notification
- [ ] Host adds guest during event creation → guest receives email + notification
- [ ] User edits RSVP → receives notification
- [ ] User exits guestlist → receives notification
- [ ] Host receives notification when guest joins
- [ ] Multiple guests in one RSVP → all receive emails
- [ ] Guest without email → no error, RSVP still succeeds
- [ ] Notification failure → RSVP still succeeds

## Future Enhancements

- Batch RSVP creation for multiple guests
- RSVP templates for recurring events
- Custom notification messages
- Email template customization
- SMS notifications (if budget allows)