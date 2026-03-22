// Input sanitization utilities
// Prevents XSS and injection attacks

// Escape HTML special characters
export function escapeHtml(str: string): string {
    const htmlEscapes: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

// Remove potentially dangerous characters
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    return input
        .trim()
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
}

// Validate email format
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate password strength
export function validatePassword(password: string): { valid: boolean; message: string } {
    if (password.length < 6) {
        return { valid: false, message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    }
    if (password.length > 128) {
        return { valid: false, message: 'كلمة المرور طويلة جداً' };
    }
    return { valid: true, message: '' };
}

// Sanitize object - recursively sanitize all string values
export function sanitizeObject<T extends object>(obj: T): T {
    const sanitized: any = {};
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            sanitized[key] = sanitizeInput(obj[key] as string);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitized[key] = sanitizeObject(obj[key] as object);
        } else {
            sanitized[key] = obj[key];
        }
    }
    return sanitized as T;
}
