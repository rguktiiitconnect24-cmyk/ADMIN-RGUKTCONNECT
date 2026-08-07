/**
 * Centralized mapping for Google Drive backends.
 * This allows assigning different Google Apps Script URLs to specific branches and years.
 */

export const DRIVE_BACKENDS = {
    // Format: 'programId_yearId_branchId' : 'AppsScriptURL'
    'btech_btech1_aiml': 'https://script.google.com/macros/s/AKfycbyLa8UrT7k0gjYewe2F44bZGrHJzsBUo7oMxWZoMXhsD-2XlQnkwHLtyLz-XDnswivU/exec',
    'btech_btech1_ce': 'https://script.google.com/macros/s/AKfycbwoBvD9wuAFz0dyTx2ZaSXDpd8qeCdlB9N3fuoXF-lFNuSviyAPiqfeFDe-rjHLt9P9xg/exec',
    'btech_btech1_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    'btech_btech1_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    'btech_btech2_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    'btech_btech3_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    'btech_btech4_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    
    // CHE Endpoints (Update these URLs after deploying your new CHE Apps Script)
    'btech_btech1_che': 'https://script.google.com/macros/s/AKfycbxVjDF7lKdSZqgAbyS1zy14H_qPjuU-tDXkZ-gUlnNZoz11h0umSJqrYt6htfFLx0KVIA/exec',
    'btech_btech2_che': 'https://script.google.com/macros/s/AKfycbxVjDF7lKdSZqgAbyS1zy14H_qPjuU-tDXkZ-gUlnNZoz11h0umSJqrYt6htfFLx0KVIA/exec',
    'btech_btech3_che': 'https://script.google.com/macros/s/AKfycbxVjDF7lKdSZqgAbyS1zy14H_qPjuU-tDXkZ-gUlnNZoz11h0umSJqrYt6htfFLx0KVIA/exec',
    'btech_btech4_che': 'https://script.google.com/macros/s/AKfycbxVjDF7lKdSZqgAbyS1zy14H_qPjuU-tDXkZ-gUlnNZoz11h0umSJqrYt6htfFLx0KVIA/exec',

    // MME Endpoints (Update these URLs after deploying your new MME Apps Script)
    'btech_btech1_mme': 'https://script.google.com/macros/s/AKfycbxgAh_mxxgbPnWzVIn2YWDDuvMZrKSSemGNXUJAHKJebVRaF3RHCVWKpS8U1xgLgL2a/exec',
    'btech_btech2_mme': 'https://script.google.com/macros/s/AKfycbxgAh_mxxgbPnWzVIn2YWDDuvMZrKSSemGNXUJAHKJebVRaF3RHCVWKpS8U1xgLgL2a/exec',
    'btech_btech3_mme': 'https://script.google.com/macros/s/AKfycbxgAh_mxxgbPnWzVIn2YWDDuvMZrKSSemGNXUJAHKJebVRaF3RHCVWKpS8U1xgLgL2a/exec',
    'btech_btech4_mme': 'https://script.google.com/macros/s/AKfycbxgAh_mxxgbPnWzVIn2YWDDuvMZrKSSemGNXUJAHKJebVRaF3RHCVWKpS8U1xgLgL2a/exec',
};

/**
 * Resolves the Google Drive Backend URL for a given section.
 * @param {string} programId - e.g., 'btech'
 * @param {string} yearId - e.g., 'btech1'
 * @param {string} branchId - e.g., 'aiml'
 * @returns {string|null} The backend URL, or null if no backend is configured.
 */
export const resolveBackendUrl = (programId, yearId, branchId) => {
    if (!programId || !yearId || !branchId) return null;
    const key = `${programId}_${yearId}_${branchId}`;
    return DRIVE_BACKENDS[key] || null;
};
