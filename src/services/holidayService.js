
const API_KEY = "AIzaSyAUq7whUeEkgUDtlrDqH5oPXrkYf47Un9Y";
const CALENDAR_ID = "en.indian#holiday@group.v.calendar.google.com";
const CACHE_KEY = 'google_holidays_cache';
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

class HolidayService {
    constructor() {
        this.holidays = this._loadFromCache();
    }

    _loadFromCache() {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_EXPIRY) {
                return data;
            }
        }
        return null;
    }

    _saveToCache(data) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        this.holidays = data;
    }

    async fetchHolidays(year = new Date().getFullYear()) {
        if (this.holidays && this.holidays.some(h => h.start.date.startsWith(year.toString()))) {
            return this.holidays;
        }

        const timeMin = `${year}-01-01T00:00:00Z`;
        const timeMax = `${year}-12-31T23:59:59Z`;
        const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.error) {
                console.warn("Google Calendar API Error:", data.error.message);
                // Return empty array or existing holidays if available
                return this.holidays || [];
            }

            const holidays = data.items || [];
            this._saveToCache(holidays);
            return holidays;
        } catch (error) {
            console.error("Failed to fetch holidays from Google Calendar:", error);
            return this.holidays || [];
        }
    }

    /**
     * Checks if a specific date is a holiday.
     * @param {Date|string} date - Date object or ISO string (YYYY-MM-DD)
     * @returns {Promise<Object|null>} Holiday object if found, else null
     */
    async isHoliday(date) {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const year = dateStr.split('-')[0];
        
        const holidays = await this.fetchHolidays(year);
        return holidays.find(h => h.start.date === dateStr) || null;
    }

    /**
     * Gets today's holiday if any.
     */
    async getTodayHoliday() {
        const today = new Date().toISOString().split('T')[0];
        return await this.isHoliday(today);
    }
}

export const holidayService = new HolidayService();
