/**
 * Utility Functions
 * Common helper functions used throughout the application
 */

// Debounce function for search inputs
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Format file size for display
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format date for display
function formatDate(date, options = {}) {
    if (!date) return '';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }
    
    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

// Format time ago (e.g., "2 minutes ago")
function timeAgo(date) {
    if (!date) return '';
    
    const now = new Date();
    const past = date instanceof Date ? date : new Date(date);
    const diffInSeconds = Math.floor((now - past) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    }
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count > 0) {
            return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
        }
    }
    
    return 'Just now';
}

// Sanitize HTML to prevent XSS
function sanitizeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Escape special characters for use in regex
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Deep clone an object
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (Array.isArray(obj)) {
        return obj.map(deepClone);
    }
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    
    return cloned;
}

// Generate unique ID
function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Check if value is empty (null, undefined, empty string, empty array, empty object)
function isEmpty(value) {
    if (value === null || value === undefined) {
        return true;
    }
    
    if (typeof value === 'string') {
        return value.trim() === '';
    }
    
    if (Array.isArray(value)) {
        return value.length === 0;
    }
    
    if (typeof value === 'object') {
        return Object.keys(value).length === 0;
    }
    
    return false;
}

// Validate email address
function isValidEmail(email) {
    if (!email || typeof email !== 'string') {
        return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

// Validate phone number (basic validation)
function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') {
        return false;
    }
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check for common phone number lengths
    return digits.length >= 10 && digits.length <= 15;
}

// Copy text to clipboard
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'absolute';
            textArea.style.left = '-999999px';
            
            document.body.prepend(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                return true;
            } catch (error) {
                console.error('Fallback clipboard copy failed:', error);
                return false;
            } finally {
                textArea.remove();
            }
        }
    } catch (error) {
        console.error('Clipboard copy failed:', error);
        return false;
    }
}

// Download data as file
function downloadAsFile(data, filename, type = 'application/json') {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// Get file extension from filename
function getFileExtension(filename) {
    if (!filename || typeof filename !== 'string') {
        return '';
    }
    
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.slice(lastDotIndex + 1).toLowerCase() : '';
}

// Check if file type is supported
function isSupportedFileType(file, supportedTypes) {
    if (!file || !supportedTypes || !Array.isArray(supportedTypes)) {
        return false;
    }
    
    const fileExtension = getFileExtension(file.name);
    const mimeType = file.type;
    
    return supportedTypes.some(type => {
        if (type.startsWith('.')) {
            return fileExtension === type.slice(1);
        }
        return mimeType === type;
    });
}

// Convert CSV data to array of objects
function parseCSVLine(line, delimiter = ',') {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Calculate text similarity (simple Levenshtein distance)
function textSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;
    
    const a = str1.toLowerCase();
    const b = str2.toLowerCase();
    
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    
    const matrix = [];
    
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    
    const maxLength = Math.max(a.length, b.length);
    return (maxLength - matrix[b.length][a.length]) / maxLength;
}

// Format number with commas
function formatNumber(num) {
    if (typeof num !== 'number') {
        return num;
    }
    
    return num.toLocaleString();
}

// Calculate percentage
function calculatePercentage(value, total, decimals = 1) {
    if (!total || total === 0) return '0.0';
    
    const percentage = (value / total) * 100;
    return percentage.toFixed(decimals);
}

// Truncate text with ellipsis
function truncateText(text, maxLength, suffix = '...') {
    if (!text || typeof text !== 'string') {
        return '';
    }
    
    if (text.length <= maxLength) {
        return text;
    }
    
    return text.slice(0, maxLength - suffix.length) + suffix;
}

// Capitalize first letter of each word
function titleCase(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.toLowerCase().replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

// Convert camelCase to kebab-case
function camelToKebab(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

// Convert kebab-case to camelCase
function kebabToCamel(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }
    
    return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

// Remove duplicates from array
function removeDuplicates(arr, key = null) {
    if (!Array.isArray(arr)) {
        return [];
    }
    
    if (key) {
        const seen = new Set();
        return arr.filter(item => {
            const keyValue = item[key];
            if (seen.has(keyValue)) {
                return false;
            }
            seen.add(keyValue);
            return true;
        });
    }
    
    return [...new Set(arr)];
}

// Sort array of objects by property
function sortBy(arr, property, direction = 'asc') {
    if (!Array.isArray(arr)) {
        return [];
    }
    
    return arr.sort((a, b) => {
        let aVal = a[property];
        let bVal = b[property];
        
        // Handle case-insensitive string sorting
        if (typeof aVal === 'string' && typeof bVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) {
            return direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
            return direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
}

// Group array of objects by property
function groupBy(arr, property) {
    if (!Array.isArray(arr)) {
        return {};
    }
    
    return arr.reduce((groups, item) => {
        const key = item[property];
        groups[key] = groups[key] || [];
        groups[key].push(item);
        return groups;
    }, {});
}

// Get nested object property safely
function getNestedProperty(obj, path, defaultValue = undefined) {
    if (!obj || typeof obj !== 'object') {
        return defaultValue;
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current === null || current === undefined || !current.hasOwnProperty(key)) {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current;
}

// Set nested object property
function setNestedProperty(obj, path, value) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
    return true;
}

// Wait for specified milliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry function with exponential backoff
async function retry(fn, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxAttempts) {
                throw lastError;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }
    
    throw lastError;
}

// Check if running on mobile device
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check browser support for required features
function checkBrowserSupport() {
    const support = {
        fileApi: 'File' in window && 'FileReader' in window,
        localStorage: 'localStorage' in window,
        worker: 'Worker' in window,
        fetch: 'fetch' in window,
        promises: 'Promise' in window,
        clipboard: 'navigator' in window && 'clipboard' in navigator
    };
    
    const isSupported = Object.values(support).every(Boolean);
    
    return {
        ...support,
        isSupported,
        missingFeatures: Object.keys(support).filter(key => !support[key])
    };
}

// Performance timing helper
function createPerformanceTimer(name) {
    const startTime = performance.now();
    
    return {
        stop: () => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.log(`${name} took ${duration.toFixed(2)} milliseconds`);
            return duration;
        },
        
        lap: (lapName) => {
            const lapTime = performance.now();
            const duration = lapTime - startTime;
            console.log(`${name} - ${lapName}: ${duration.toFixed(2)} milliseconds`);
            return duration;
        }
    };
}

// Export utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        formatFileSize,
        formatDate,
        timeAgo,
        sanitizeHTML,
        escapeRegex,
        deepClone,
        generateId,
        isEmpty,
        isValidEmail,
        isValidPhone,
        copyToClipboard,
        downloadAsFile,
        getFileExtension,
        isSupportedFileType,
        parseCSVLine,
        textSimilarity,
        formatNumber,
        calculatePercentage,
        truncateText,
        titleCase,
        camelToKebab,
        kebabToCamel,
        removeDuplicates,
        sortBy,
        groupBy,
        getNestedProperty,
        setNestedProperty,
        sleep,
        retry,
        isMobileDevice,
        checkBrowserSupport,
        createPerformanceTimer
    };
}