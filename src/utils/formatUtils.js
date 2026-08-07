/**
 * Standardizes class names into the format PREFIX-XX (e.g., MUE-01, F-07).
 * Handles Greek symbols, spacing, and zero-padding.
 */
export const formatClassID = (cls) => {
    if (!cls) return '';
    
    // 1. Initial cleanup and uppercase
    let normalized = String(cls).trim()
        .toUpperCase()
        .replace(/[μΜ]/g, 'MUE')
        .replace(/[φΦ]/g, 'PHI')
        .replace(/\s+/g, ''); // Remove all spaces

    // 2. Extract prefix and number (handles optional hyphen)
    // Supports formats like MUE1, MUE-1, F07, F-7
    const match = normalized.match(/^([A-Z]+)-?(\d+)$/);
    
    if (match) {
        const prefix = match[1];
        const num = match[2];
        
        // 3. Zero-padding logic: pad to 2 digits if single digit
        const paddedNum = num.length === 1 ? `0${num}` : num;
        
        return `${prefix}-${paddedNum}`;
    }

    // Return original normalized if it doesn't match the pattern
    return normalized;
};

/**
 * Parses a time range string like "09:30 AM - 12:30 PM" 
 * and returns start/end Date objects for the current day.
 */
export const parseTimeRange = (timeRange, referenceDate = new Date()) => {
    try {
        if (!timeRange || !timeRange.includes('-')) return null;
        
        const [startPart, endPart] = timeRange.split('-').map(s => s.trim());
        
        const parse = (timeStr) => {
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return null;
            
            let [_, hours, mins, ampm] = match;
            hours = parseInt(hours, 10);
            mins = parseInt(mins, 10);
            
            if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            
            const d = new Date(referenceDate);
            d.setHours(hours, mins, 0, 0);
            return d;
        };

        const startTime = parse(startPart);
        const endTime = parse(endPart);
        
        if (!startTime || !endTime) return null;
        
        return { start: startTime, end: endTime };
    } catch (e) {
        console.error("Error parsing time range:", e);
        return null;
    }
};
/**
 * Normalizes attendance values (decimals or strings) to a number between 0 and 100.
 * e.g., 0.74 -> 74, "74%" -> 74, 74 -> 74
 */
export const normalizeAttendanceValue = (val) => {
    if (val === undefined || val === null || val === '') return 0;
    
    let num;
    if (typeof val === 'string') {
        num = parseFloat(val.replace('%', ''));
    } else {
        num = val;
    }

    if (isNaN(num)) return 0;

    // If it's a decimal (e.g., 0.74), multiply by 100
    if (num > 0 && num <= 1) {
        num = num * 100;
    }

    return num;
};

/**
 * Formats attendance decimal or raw values into a clean percentage string.
 * e.g., 0.74 -> "74%", 74 -> "74%", "74%" -> "74%"
 */
export const formatAttendancePercent = (val) => {
    const num = normalizeAttendanceValue(val);
    // Round to whole number to match user examples (e.g. 74.0 -> 74)
    const formatted = Math.round(num);
    return `${formatted}%`;
};

/**
 * Maps subject abbreviations to their full names.
 */
export const mapSubjectName = (subject) => {
    if (!subject) return '';
    const lookup = subject.trim().toLowerCase();
    const map = {
        'p': 'Physics',
        'c': 'Chemistry',
        'pt': 'Physics Tutorial',
        'ct': 'Chemistry Tutorial',
        'pl': 'Physics Lab',
        'cl': 'Chemistry Lab',
        'e': 'English',
        'm': 'Maths',
        'mt': 'Maths Tutorial',
        't': 'Telugu',
        'it': 'Information Technology',
        'it l': 'Information Technology Lab',
        'it t': 'Information Technology Tutorial'
    };
    return map[lookup] || subject;
};
