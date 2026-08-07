/**
 * Resolves a login identifier into a full institucional email address.
 * Supporting both raw College IDs (e.g., R240456) and full emails.
 * 
 * @param {string} identifier - The ID or email entered by the user
 * @returns {string} - The full institutional email address
 */
export const resolveInstitutionalEmail = (identifier) => {
    if (!identifier) return '';

    const cleanInput = identifier.trim().toLowerCase();

    // 1. If it's already an email, return as is
    if (cleanInput.includes('@')) {
        return cleanInput;
    }

    // 2. Check if it matches the College ID pattern (Letter followed by 6 digits)
    // Common prefixes: R, S, O, N
    const idPattern = /^[a-z]\d{6}$/i;
    
    if (idPattern.test(cleanInput)) {
        // Standard institutional domain for students
        return `${cleanInput}@rguktrkv.ac.in`;
    }

    // 3. Fallback: Return original trimmed input (might be admin or custom email)
    return cleanInput;
};

/**
 * Generates a unique RGUKT Connect ID based on a student ID or random.
 * 
 * @param {string} studentId - The student's institutional ID
 * @returns {string} - The generated RCxxxxxxxx ID
 */
export const generateRGUKTConnectID = (studentId) => {
    let yearPart = '';
    
    // 1. Get the 2-digit year from studentId or current date
    if (studentId) {
        const digits = studentId.replace(/\D/g, '');
        if (digits.length >= 2) {
            yearPart = digits.substring(0, 2);
        }
    }

    if (!yearPart) {
        yearPart = new Date().getFullYear().toString().substring(2);
    }

    // 2. Remove zeros from the year part as per previous requirement
    const cleanYear = yearPart.replace(/0/g, '');
    
    // 3. Calculate how many random digits we need to reach exactly 6 total
    const neededLength = 6 - cleanYear.length;
    
    // 4. Generate random digits (1-9 only)
    const randomPart = Array.from(
        { length: Math.max(0, neededLength) }, 
        () => Math.floor(Math.random() * 9) + 1
    ).join('');

    return `RC${cleanYear}${randomPart}`;
};





