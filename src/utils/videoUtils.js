/**
 * Converts a standard video URL into an embeddable URL.
 * Currently supports:
 * - YouTube (watch URLs, share URLs, shorts)
 * - Standard video files (mp4, webm) - returns as is
 * 
 * @param {string} url - The raw URL provided by the user
 * @returns {string} - The embeddable URL
 */
export const getEmbedUrl = (url) => {
    if (!url) return '';

    // YouTube: Handle various formats
    // Standard: https://www.youtube.com/watch?v=VIDEO_ID
    // Share: https://youtu.be/VIDEO_ID
    // Embed: https://www.youtube.com/embed/VIDEO_ID

    // Regex to capture video ID
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([^#&?]*).*/;

    const match = url.match(youtubeRegex);
    if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?rel=0`;
    }

    // Return original URL if no specific handler matches (assuming it might be a direct link or already correct)
    return url;
};

/**
 * Converts a PDF URL into an embeddable URL.
 * @param {string} url - Original URL
 * @param {boolean} useFallback - Force use of Google Docs Viewer proxy
 */
export const getPdfEmbedUrl = (url, useFallback = false) => {
    if (!url) return '';

    // If backup viewer is requested (Google Docs Viewer proxy)
    if (useFallback) {
        return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true&rm=minimal`;
    }

    // Extract Google Drive ID using more comprehensive regex
    const driveIdMatch = url.match(/(?:\/d\/|id=)([-\w]{25,})/);
    const driveId = driveIdMatch ? driveIdMatch[1] : null;

    if (url.includes('drive.google.com') && driveId) {
        // Force the embeddable preview layout with minimal UI
        return `https://drive.google.com/file/d/${driveId}/preview?rm=minimal`;
    }

    // Direct PDF files
    if (url.toLowerCase().endsWith('.pdf')) {
        return `${url}#view=FitH&scrollbar=0&toolbar=0&navpanes=0`;
    }

    return url;
};

/**
 * Returns a direct URL for PDF viewing/downloading that bypasses the Drive UI.
 */
export const getDirectPdfUrl = (url) => {
    if (!url) return '';

    const driveIdMatch = url.match(/(?:\/d\/|id=)([-\w]{25,})/);
    const driveId = driveIdMatch ? driveIdMatch[1] : null;

    if (url.includes('drive.google.com') && driveId) {
        // This format usually bypasses the "sign in" UI for public links
        return `https://drive.google.com/uc?id=${driveId}&export=view`;
    }

    return url;
};
