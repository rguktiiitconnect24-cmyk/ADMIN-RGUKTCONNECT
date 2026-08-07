import { Preferences } from '@capacitor/preferences';

/**
 * AutofillService
 * Handles saving and retrieving form data locally for a seamless Android autofill experience.
 * Uses Capacitor Preferences (equivalent to Android SharedPreferences).
 */

const AUTOFILL_KEY = 'rgukt_autofill_data';

export const AutofillService = {
    /**
     * Save form data locally (supports multiple profiles)
     * @param {Object} data - The form data to save (e.g., { email: '...', password: '...' })
     */
    async save(data) {
        if (!data || !data.email) return;
        
        try {
            // Get existing profiles array
            const profiles = await this.get();
            
            // Check if profile already exists by email (case-insensitive)
            const index = profiles.findIndex(p => p.email.toLowerCase() === data.email.toLowerCase());
            
            if (index !== -1) {
                // Update existing profile with new data (e.g. updated password)
                profiles[index] = { ...profiles[index], ...data };
            } else {
                // Add as a new profile to the list
                profiles.unshift(data); // Add to top of list
            }
            
            // Limit to e.g. 5 profiles to keep it clean
            const limitedProfiles = profiles.slice(0, 5);
            
            await Preferences.set({
                key: AUTOFILL_KEY,
                value: JSON.stringify(limitedProfiles)
            });
            console.log('Autofill profile saved successfully');
        } catch (error) {
            console.error('Error saving autofill data:', error);
        }
    },

    /**
     * Retrieve saved autofill data as an array
     * @returns {Array} - The list of saved profiles
     */
    async get() {
        try {
            const { value } = await Preferences.get({ key: AUTOFILL_KEY });
            if (!value) return [];
            
            const parsed = JSON.parse(value);
            
            // Migration: If the old data was a single object, wrap it in an array
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return [parsed];
            }
            
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error retrieving autofill data:', error);
            return [];
        }
    },

    /**
     * Clear all saved autofill data
     */
    async clear() {
        try {
            await Preferences.remove({ key: AUTOFILL_KEY });
            console.log('Autofill data cleared');
        } catch (error) {
            console.error('Error clearing autofill data:', error);
        }
    }
};
