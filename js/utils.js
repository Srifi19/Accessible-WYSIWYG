// utils.js

/**
 * Escape HTML for safe insertion into the document
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (s) => {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s];
    });
}

/**
 * Validate if a string is a valid URL
 * @param {string} text - The text to check
 * @returns {boolean} True if the text is a valid URL, else false
 */
export function isValidUrl(text) {
    try {
        const url = new URL(addProtocolIfMissing(text));
        return true;
    } catch {
        return false;
    }
}

/**
 * Adds 'https://' protocol to a URL if it is missing
 * @param {string} url - The URL to check
 * @returns {string} The URL with protocol
 */
export function addProtocolIfMissing(url) {
    if (!/^https?:\/\//i.test(url)) {
        return 'https://' + url;
    }
    return url;
}

/**
 * Create and download a blob file from content
 * @param {string} content - The content to be saved in the file
 * @param {string} filename - The name of the file to be downloaded
 * @param {string} type - The MIME type of the file
 */
export function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log(`💾 Downloaded file: ${filename}`);
}