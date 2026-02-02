/**
 * Message Customization Engine
 * Handles replacing merge fields with customer data and formatting messages
 */

class MessageCustomizer {
    constructor() {
        this.template = '';
        this.fieldMapping = {};
        this.customizedMessages = new Map();
        this.validationCache = new Map();
    }

    /**
     * Customize message for a specific customer
     * @param {string} template - Message template with merge fields
     * @param {Object} customerData - Customer data object
     * @param {Object} fieldMapping - Mapping of merge fields to data columns
     * @returns {Object} - Customization result
     */
    customizeMessage(template, customerData, fieldMapping) {
        try {
            if (!template || typeof template !== 'string') {
                return {
                    success: false,
                    error: 'No template provided'
                };
            }

            if (!customerData || typeof customerData !== 'object') {
                return {
                    success: false,
                    error: 'No customer data provided'
                };
            }

            if (!fieldMapping || typeof fieldMapping !== 'object') {
                return {
                    success: false,
                    error: 'No field mapping provided'
                };
            }

            // Store current template and mapping
            this.template = template;
            this.fieldMapping = fieldMapping;

            // Perform field replacement
            const result = this.replaceFields(template, customerData, fieldMapping);
            
            if (!result.success) {
                return result;
            }

            // Validate the customized message
            const validation = this.validateCustomization(result.message, template, customerData);

            return {
                success: true,
                message: result.message,
                originalMessage: template,
                replacements: result.replacements,
                validation: validation,
                metadata: {
                    processedAt: new Date().toISOString(),
                    fieldsReplaced: result.replacements.length,
                    hasValidationWarnings: validation.warnings.length > 0
                }
            };

        } catch (error) {
            console.error('Message customization error:', error);
            return {
                success: false,
                error: 'Message customization failed: ' + error.message
            };
        }
    }

    /**
     * Replace merge fields in template with customer data
     * @param {string} template - Template with merge fields
     * @param {Object} customerData - Customer data
     * @param {Object} fieldMapping - Field mapping
     * @returns {Object} - Replacement result
     */
    replaceFields(template, customerData, fieldMapping) {
        const mergeFieldRegex = /\ \[([^\\]+)\] /g;
        const replacements = [];
        let processedMessage = template;
        let match;

        // Reset regex index
        mergeFieldRegex.lastIndex = 0;

        // Find all merge fields in template
        const fieldsToReplace = [];
        while ((match = mergeFieldRegex.exec(template)) !== null) {
            fieldsToReplace.push({
                fullField: match[0], // [Field Name]
                fieldName: match[1], // Field Name
                index: match.index
            });
        }

        // Process each unique field
        const uniqueFields = [...new Set(fieldsToReplace.map(f => f.fullField))];
        
        for (const mergeField of uniqueFields) {
            const fieldName = mergeField.replace(/^\ \[|]\ $/g, '');
            const dataColumn = fieldMapping[mergeField];
            
            if (!dataColumn) {
                // Field mapping not found
                replacements.push({
                    field: mergeField,
                    dataColumn: null,
                    originalValue: mergeField,
                    replacedValue: `[UNMAPPED: ${fieldName}]`,
                    status: 'unmapped'
                });
                
                processedMessage = processedMessage.replace(
                    new RegExp(this.escapeRegex(mergeField), 'g'),
                    `[UNMAPPED: ${fieldName}]`
                );
                continue;
            }

            // Get customer data value
            const customerValue = this.getCustomerValue(customerData, dataColumn);
            const formattedValue = this.formatValue(customerValue, fieldName, dataColumn);
            
            replacements.push({
                field: mergeField,
                dataColumn: dataColumn,
                originalValue: customerValue,
                replacedValue: formattedValue,
                status: customerValue ? 'replaced' : 'missing'
            });

            // Replace all instances of this field
            processedMessage = processedMessage.replace(
                new RegExp(this.escapeRegex(mergeField), 'g'),
                formattedValue
            );
        }

        return {
            success: true,
            message: processedMessage,
            replacements: replacements
        };
    }

    /**
     * Get customer data value with fallback handling
     * @param {Object} customerData - Customer data object
     * @param {string} dataColumn - Column name to retrieve
     * @returns {*} - Customer value or null if not found
     */
    getCustomerValue(customerData, dataColumn) {
        if (!customerData || !dataColumn) {
            return null;
        }

        // Direct property access
        if (customerData.hasOwnProperty(dataColumn)) {
            return customerData[dataColumn];
        }

        // Case-insensitive search
        const keys = Object.keys(customerData);
        const matchingKey = keys.find(key => 
            key.toLowerCase() === dataColumn.toLowerCase()
        );

        if (matchingKey) {
            return customerData[matchingKey];
        }

        // Fuzzy matching for common variations
        const fuzzyKey = keys.find(key => {
            const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
            const normalizedColumn = dataColumn.toLowerCase().replace(/\s+/g, '');
            return normalizedKey.includes(normalizedColumn) || 
                   normalizedColumn.includes(normalizedKey);
        });

        if (fuzzyKey) {
            return customerData[fuzzyKey];
        }

        return null;
    }

    /**
     * Format value for display in message
     * @param {*} value - Raw value to format
     * @param {string} fieldName - Original field name for context
     * @param {string} dataColumn - Data column name for context
     * @returns {string} - Formatted value
     */
    formatValue(value, fieldName, dataColumn) {
        // Handle null/undefined values
        if (value === null || value === undefined) {
            return `[MISSING: ${fieldName}]`;
        }

        // Handle empty strings
        if (typeof value === 'string' && value.trim() === '') {
            return `[EMPTY: ${fieldName}]`;
        }

        // Convert to string
        let formattedValue = String(value).trim();

        // Format dates if the field appears to be date-related
        if (this.isDateField(fieldName, dataColumn)) {
            const dateValue = this.parseDate(formattedValue);
            if (dateValue) {
                formattedValue = this.formatDate(dateValue);
            }
        }

        // Format names (capitalize properly)
        if (this.isNameField(fieldName, dataColumn)) {
            formattedValue = this.formatName(formattedValue);
        }

        // Format email addresses (lowercase)
        if (this.isEmailField(fieldName, dataColumn)) {
            formattedValue = formattedValue.toLowerCase();
        }

        // Format phone numbers
        if (this.isPhoneField(fieldName, dataColumn)) {
            formattedValue = this.formatPhone(formattedValue);
        }

        return formattedValue;
    }

    /**
     * Check if field is date-related
     * @param {string} fieldName - Field name
     * @param {string} dataColumn - Data column name
     * @returns {boolean} - True if date field
     */
    isDateField(fieldName, dataColumn) {
        const dateKeywords = ['date', 'expir', 'due', 'renew', 'birth', 'created', 'updated'];
        const combined = `${fieldName} ${dataColumn}`.toLowerCase();
        return dateKeywords.some(keyword => combined.includes(keyword));
    }

    /**
     * Check if field is name-related
     * @param {string} fieldName - Field name
     * @param {string} dataColumn - Data column name
     * @returns {boolean} - True if name field
     */
    isNameField(fieldName, dataColumn) {
        const nameKeywords = ['name', 'first', 'last', 'full', 'customer', 'client'];
        const combined = `${fieldName} ${dataColumn}`.toLowerCase();
        return nameKeywords.some(keyword => combined.includes(keyword));
    }

    /**
     * Check if field is email-related
     * @param {string} fieldName - Field name
     * @param {string} dataColumn - Data column name
     * @returns {boolean} - True if email field
     */
    isEmailField(fieldName, dataColumn) {
        const emailKeywords = ['email', 'mail', '@'];
        const combined = `${fieldName} ${dataColumn}`.toLowerCase();
        return emailKeywords.some(keyword => combined.includes(keyword));
    }

    /**
     * Check if field is phone-related
     * @param {string} fieldName - Field name
     * @param {string} dataColumn - Data column name
     * @returns {boolean} - True if phone field
     */
    isPhoneField(fieldName, dataColumn) {
        const phoneKeywords = ['phone', 'tel', 'mobile', 'cell', 'contact'];
        const combined = `${fieldName} ${dataColumn}`.toLowerCase();
        return phoneKeywords.some(keyword => combined.includes(keyword));
    }

    /**
     * Parse date from various formats
     * @param {string} dateString - Date string to parse
     * @returns {Date|null} - Parsed date or null
     */
    parseDate(dateString) {
        if (!dateString) return null;

        // Try standard Date parsing first
        const standardDate = new Date(dateString);
        if (!isNaN(standardDate.getTime())) {
            return standardDate;
        }

        // Try common formats
        const formats = [
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            /(\d{4})-(\d{1,2})-(\d{1,2})/,
            /(\d{1,2})-(\d{1,2})-(\d{4})/,
        ];

        for (const format of formats) {
            const match = dateString.match(format);
            if (match) {
                const date = new Date(match[0]);
                if (!isNaN(date.getTime())) {
                    return date;
                }
            }
        }

        return null;
    }

    /**
     * Format date for display
     * @param {Date} date - Date to format
     * @returns {string} - Formatted date string
     */
    formatDate(date) {
        if (!date || isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Format name with proper capitalization
     * @param {string} name - Name to format
     * @returns {string} - Formatted name
     */
    formatName(name) {
        if (!name || typeof name !== 'string') {
            return name;
        }

        return name
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace(/\bMc(\w)/g, 'Mc$1')  // Handle McDonald, etc.
            .replace(/\bO'(\w)/g, "O'$1"); // Handle O'Connor, etc.
    }

    /**
     * Format phone number
     * @param {string} phone - Phone number to format
     * @returns {string} - Formatted phone number
     */
    formatPhone(phone) {
        if (!phone || typeof phone !== 'string') {
            return phone;
        }

        // Remove all non-digits
        const digits = phone.replace(/\D/g, '');

        // Format US phone numbers
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }

        if (digits.length === 11 && digits[0] === '1') {
            return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }

        // Return original if can't format
        return phone;
    }

    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\n\t\f\r ]+@[^\n\t\f\r ]+\.[^\n\t\f\r ]+$/;
        return emailRegex.test(email.trim());
    }

    isValidPhone(phone) {
        if (!phone || typeof phone !== 'string') return false;
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    }

    /**
     * Validate customized message
     * @param {string} message - Customized message
     * @param {string} originalTemplate - Original template
     * @param {Object} customerData - Customer data object
     * @returns {Object} - Validation result
     */
    validateCustomization(message, originalTemplate, customerData) {
        const validation = {
            isValid: true,
            warnings: [],
            errors: [],
            stats: {
                unreplacedFields: 0,
                missingFields: 0,
                unmappedFields: 0
            }
        };

        // Check for unprocessed merge fields
        const unreplacedFields = message.match(/\ \[([^\\]+)\] /g) || [];
        const missingFields = message.match(/ \[MISSING: ([^\\]+)\] /g) || [];
        const unmappedFields = message.match(/ \[UNMAPPED: ([^\\]+)\] /g) || [];

        validation.stats.unreplacedFields = unreplacedFields.length;
        validation.stats.missingFields = missingFields.length;
        validation.stats.unmappedFields = unmappedFields.length;

        // Add warnings for issues
        if (unmappedFields.length > 0) {
            validation.warnings.push(`${unmappedFields.length} field(s) could not be mapped to data columns`);
        }

        if (missingFields.length > 0) {
            validation.warnings.push(`${missingFields.length} field(s) have missing customer data`);
        }

        // Check message length
        if (message.length < 50) {
            validation.warnings.push('Message seems very short');
        }

        if (message.length > 5000) {
            validation.warnings.push('Message is very long and might be truncated in some email clients');
        }

        // Validate email
        const emailColumn = Object.keys(this.fieldMapping).find(key => this.isEmailField(key, this.fieldMapping[key]));
        if (emailColumn) {
            const email = this.getCustomerValue(customerData, this.fieldMapping[emailColumn]);
            if (email && !this.isValidEmail(email)) {
                validation.warnings.push(`Invalid email address format: ${email}`);
            }
        }

        // Validate phone
        const phoneColumn = Object.keys(this.fieldMapping).find(key => this.isPhoneField(key, this.fieldMapping[key]));
        if (phoneColumn) {
            const phone = this.getCustomerValue(customerData, this.fieldMapping[phoneColumn]);
            if (phone && !this.isValidPhone(phone)) {
                validation.warnings.push(`Invalid phone number format: ${phone}`);
            }
        }

        // Mark as invalid if there are critical issues
        if (unmappedFields.length > 0 || missingFields.length > 0) {
            validation.isValid = false;
        }

        return validation;
    }

    /**
     * Format message for email delivery
     * @param {string} message - Customized message
     * @param {Object} options - Formatting options
     * @returns {Object} - Object with subject and body properties
     */
    formatForEmail(message, options = {}) {
        if (!message || typeof message !== 'string') {
            return { subject: '', body: '' };
        }

        const {
            customerName = 'Valued Customer',
            addHtmlFormatting = true,
            preserveLineBreaks = true,
            addSignature = false,
            signature = '',
            addUnsubscribe = true,
            unsubscribeLink = '#',
            unsubscribeText = 'Unsubscribe'
        } = options;

        let formattedMessage = message;

        if (preserveLineBreaks && addHtmlFormatting) {
            formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        }

        let unsubscribeHtml = '';
        if (addUnsubscribe) {
            unsubscribeHtml = addHtmlFormatting ?
                `<p style="font-size: 12px; color: #888; text-align: center; margin-top: 20px;"><a href="${unsubscribeLink}" style="color: #888;">${unsubscribeText}</a></p>` :
                `\n\n${unsubscribeText}: ${unsubscribeLink}`;
        }

        let signatureHtml = '';
        if (addSignature && signature) {
            signatureHtml = addHtmlFormatting ?
                `<br><br>---<br>${signature}` :
                `\n\n---\n${signature}`;
        }

        let body = formattedMessage;
        if (addHtmlFormatting) {
            body = `
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        ${formattedMessage}
                        ${signatureHtml}
                        ${unsubscribeHtml}
                    </div>
                </body>
                </html>
            `;
        } else {
            body += signatureHtml + unsubscribeHtml;
        }

        const subject = `Important Message for ${customerName}`;

        return { subject, body };
    }

    /**
     * Batch process multiple customers
     * @param {string} template - Message template
     * @param {Array} customers - Array of customer data
     * @param {Object} fieldMapping - Field mapping
     * @param {Function} progressCallback - Progress callback function
     * @returns {Promise<Array>} - Array of customization results
     */
    async batchCustomize(template, customers, fieldMapping, progressCallback) {
        const results = [];
        const total = customers.length;

        for (let i = 0; i < customers.length; i++) {
            const customer = customers[i];
            
            // Customize message for this customer
            const result = this.customizeMessage(template, customer, fieldMapping);
            
            // Add customer index for reference
            result.customerIndex = i;
            result.customerData = customer;
            
            results.push(result);

            // Call progress callback if provided
            if (progressCallback && typeof progressCallback === 'function') {
                progressCallback(i + 1, total, result);
            }

            // Add small delay every 50 customers to prevent UI blocking
            if (i % 50 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }

        return results;
    }

    /**
     * Escape special regex characters
     * @param {string} string - String to escape
     * @returns {string} - Escaped string
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\\]/g, '\\$&');
    }

    /**
     * Get customization statistics
     * @param {Array} results - Array of customization results
     * @returns {Object} - Statistics object
     */
    getCustomizationStats(results) {
        if (!results || !Array.isArray(results)) {
            return { totalProcessed: 0 };
        }

        const stats = {
            totalProcessed: results.length,
            successful: 0,
            failed: 0,
            withWarnings: 0,
            averageReplacements: 0,
            totalReplacements: 0,
            fieldStats: {}
        };

        let totalReplacements = 0;

        results.forEach(result => {
            if (result.success) {
                stats.successful++;
                
                if (result.validation && result.validation.warnings.length > 0) {
                    stats.withWarnings++;
                }
                
                if (result.replacements) {
                    totalReplacements += result.replacements.length;
                    
                    result.replacements.forEach(replacement => {
                        const field = replacement.field;
                        if (!stats.fieldStats[field]) {
                            stats.fieldStats[field] = {
                                total: 0,
                                replaced: 0,
                                missing: 0,
                                unmapped: 0
                            };
                        }
                        
                        stats.fieldStats[field].total++;
                        
                        switch (replacement.status) {
                            case 'replaced':
                                stats.fieldStats[field].replaced++;
                                break;
                            case 'missing':
                                stats.fieldStats[field].missing++;
                                break;
                            case 'unmapped':
                                stats.fieldStats[field].unmapped++;
                                break;
                        }
                    });
                }
            } else {
                stats.failed++;
            }
        });

        stats.totalReplacements = totalReplacements;
        stats.averageReplacements = results.length > 0 ? 
            (totalReplacements / results.length).toFixed(1) : 0;

        return stats;
    }

    /**
     * Reset customizer state
     */
    reset() {
        this.template = '';
        this.fieldMapping = {};
        this.customizedMessages.clear();
        this.validationCache.clear();
        console.log('Message customizer state reset');
    }

    /**
     * Get current customizer status
     * @returns {Object} - Current status
     */
    getStatus() {
        return {
            hasTemplate: !!this.template,
            templateLength: this.template.length,
            fieldMappingCount: Object.keys(this.fieldMapping).length,
            customizedCount: this.customizedMessages.size
        };
    }
}