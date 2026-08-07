/**
 * Centralized mapping for Google Drive backends.
 * This allows assigning different Google Apps Script URLs to specific branches and years.
 */

export const DRIVE_BACKENDS = {
    // Format: 'programId_yearId_branchId' : 'AppsScriptURL'
    'btech_btech1_aiml': 'https://script.google.com/macros/s/AKfycbyLa8UrT7k0gjYewe2F44bZGrHJzsBUo7oMxWZoMXhsD-2XlQnkwHLtyLz-XDnswivU/exec',
    'btech_btech1_ce': 'https://script.google.com/macros/s/AKfycbwoBvD9wuAFz0dyTx2ZaSXDpd8qeCdlB9N3fuoXF-lFNuSviyAPiqfeFDe-rjHLt9P9xg/exec',
    'btech_btech1_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    'btech_btech2_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    'btech_btech3_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
    'btech_btech4_ece': 'https://script.google.com/macros/s/AKfycbwD3utehQNLsONRaTsbQhkHH34nE5d6Rl7YT4KGBcgfhJ5hGAUcT_rg3DmjfqSsdmJb/exec',
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
