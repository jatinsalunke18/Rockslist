export const normalizePhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
};

export const normalizeEmail = (email) => {
    if (!email) return '';
    return email.toLowerCase().trim();
};

export const isValidEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalized = normalizeEmail(email);
    return emailRegex.test(normalized) && normalized.endsWith('@gmail.com');
};

export const isValidPhone = (phone) => {
    if (!phone) return false;
    const normalized = normalizePhone(phone);
    return normalized.length === 10 && /^[0-9]{10}$/.test(normalized);
};

export const isValidName = (name) => {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && /[a-zA-Z]/.test(trimmed);
};

export const validateGuestIdentity = (guest) => {
    if (!isValidName(guest.name)) {
        return { valid: false, error: 'Name must be at least 2 characters' };
    }
    
    const hasEmail = guest.email && guest.email.trim().length > 0;
    const hasPhone = guest.phone && guest.phone.trim().length > 0;
    
    if (!hasEmail && !hasPhone) {
        return { valid: false, error: 'Email or phone number is required' };
    }
    
    if (hasEmail && !isValidEmail(guest.email)) {
        return { valid: false, error: 'Valid Gmail address required' };
    }
    
    if (hasPhone && !isValidPhone(guest.phone)) {
        return { valid: false, error: 'Phone must be exactly 10 digits' };
    }
    
    return { valid: true };
};

export const findDuplicateGuest = (newGuest, existingGuests, currentUser, isPrimaryUser = false) => {
    const newEmail = normalizeEmail(newGuest.email);
    const newPhone = normalizePhone(newGuest.phone);
    const userEmail = normalizeEmail(currentUser?.email);
    const userPhone = normalizePhone(currentUser?.phoneNumber);
    
    if (!isPrimaryUser) {
        if (newEmail && userEmail && newEmail === userEmail) {
            return { isDuplicate: true, error: 'You are already the primary user' };
        }
        
        if (newPhone && userPhone && newPhone === userPhone) {
            return { isDuplicate: true, error: 'You are already the primary user' };
        }
    }
    
    for (const guest of existingGuests) {
        const guestEmail = normalizeEmail(guest.email);
        const guestPhone = normalizePhone(guest.phone);
        
        if (newEmail && guestEmail && newEmail === guestEmail) {
            return { isDuplicate: true, error: 'This email is already added to the guestlist' };
        }
        
        if (newPhone && guestPhone && newPhone === guestPhone) {
            return { isDuplicate: true, error: 'This phone number is already added' };
        }
    }
    
    return { isDuplicate: false };
};

export const checkEventLevelDuplicate = async (db, eventId, guests, currentUserId) => {
    const { collection, getDocs } = await import('firebase/firestore');
    const rsvpsRef = collection(db, `lists/${eventId}/rsvps`);
    const snapshot = await getDocs(rsvpsRef);
    
    for (const doc of snapshot.docs) {
        const rsvpData = doc.data();
        if (rsvpData.userId === currentUserId) {
            return { isDuplicate: true, error: 'You have already joined this event' };
        }
        
        if (rsvpData.guests && Array.isArray(rsvpData.guests)) {
            for (const existingGuest of rsvpData.guests) {
                for (const newGuest of guests) {
                    const existingEmail = normalizeEmail(existingGuest.email);
                    const newEmail = normalizeEmail(newGuest.email);
                    const existingPhone = normalizePhone(existingGuest.phone);
                    const newPhone = normalizePhone(newGuest.phone);
                    
                    if (newEmail && existingEmail && newEmail === existingEmail) {
                        return { isDuplicate: true, error: 'This email is already part of this event' };
                    }
                    
                    if (newPhone && existingPhone && newPhone === existingPhone) {
                        return { isDuplicate: true, error: 'This phone number is already part of this event' };
                    }
                }
            }
        }
    }
    
    return { isDuplicate: false };
};
