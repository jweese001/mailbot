
class SimpleMailBot {
    constructor() {
        // DOM Elements
        this.uploadSection = document.getElementById('uploadSection');
        this.reviewSection = document.getElementById('reviewSection');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.templateDropZone = document.getElementById('templateDropZone');
        this.smsTemplateDropZone = document.getElementById('smsTemplateDropZone');
        this.dataDropZone = document.getElementById('dataDropZone');
        this.templateFileInput = document.getElementById('templateFileInput');
        this.smsTemplateFileInput = document.getElementById('smsTemplateFileInput');
        this.dataFileInput = document.getElementById('dataFileInput');
        this.templateFileStatus = document.getElementById('templateFileStatus');
        this.smsTemplateFileStatus = document.getElementById('smsTemplateFileStatus');
        this.dataFileStatus = document.getElementById('dataFileStatus');
        this.errorMessage = document.getElementById('error-message');

        this.customerEmailEl = document.getElementById('customerEmail');
        this.customerPhoneEl = document.getElementById('customerPhone');
        this.emailSubjectEl = document.getElementById('emailSubject');
        this.emailPreviewEl = document.getElementById('emailPreview');
        this.emailPreviewSection = document.getElementById('emailPreviewSection');
        this.smsPreviewEl = document.getElementById('smsPreview');
        this.smsPreviewSection = document.getElementById('smsPreviewSection');
        this.customerIndexEl = document.getElementById('customerIndex');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.skipBtn = document.getElementById('skipBtn');
        this.desktopBtn = document.getElementById('desktopBtn');
        this.outlookLiveBtn = document.getElementById('outlookLiveBtn');
        this.outlookOfficeBtn = document.getElementById('outlookOfficeBtn');
        this.updateSubjectBtn = document.getElementById('updateSubjectBtn');
        this.smsMessagesBtn = document.getElementById('smsMessagesBtn');
        this.smsRingCentralBtn = document.getElementById('smsRingCentralBtn');
        this.smsCharCounter = document.getElementById('smsCharCounter');
        this.charCountText = document.getElementById('charCountText');

        // Mapping Modal Elements
        this.mappingModal = document.getElementById('mappingModal');
        this.mappingContainer = document.getElementById('mappingContainer');
        this.emailColumnSelect = document.getElementById('emailColumnSelect');
        this.phoneColumnSelect = document.getElementById('phoneColumnSelect');
        this.confirmMappingBtn = document.getElementById('confirmMappingBtn');

        // App State
        this.templateFile = null;      // Email template file
        this.smsTemplateFile = null;   // SMS template file
        this.dataFile = null;
        this.customers = [];
        this.mergeFields = [];         // Combined merge fields from both templates
        this.emailMergeFields = [];    // Fields from email template
        this.smsMergeFields = [];      // Fields from SMS template
        this.fieldMapping = {};
        this.emailColumn = '';
        this.phoneColumn = '';
        this.template = '';            // Email template HTML
        this.smsTemplate = '';         // SMS template HTML
        this.currentIndex = 0;

        // Modules
        this.dataImporter = new CustomerDataImporter();
        this.messageEngine = new MessageCustomizer();

        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.templateFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'template'));
        this.smsTemplateFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'smsTemplate'));
        this.dataFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'data'));
        this.setupDropZone(this.templateDropZone, (file) => this.handleFileDrop(file, 'template'));
        this.setupDropZone(this.smsTemplateDropZone, (file) => this.handleFileDrop(file, 'smsTemplate'));
        this.setupDropZone(this.dataDropZone, (file) => this.handleFileDrop(file, 'data'));
        this.prevBtn.addEventListener('click', () => this.navigate(-1));
        this.nextBtn.addEventListener('click', () => this.navigate(1));
        this.skipBtn.addEventListener('click', () => this.navigate(1));
        this.confirmMappingBtn.addEventListener('click', () => this.finalizeMapping());
        this.updateSubjectBtn.addEventListener('click', () => this.updateEmailLinks());
    }

    setupDropZone(element, callback) {
        element.addEventListener('dragover', (e) => { e.preventDefault(); element.classList.add('drag-over'); });
        element.addEventListener('dragleave', () => element.classList.remove('drag-over'));
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) callback(e.dataTransfer.files[0]);
        });
    }

    handleFileSelect(event, type) {
        if (event.target.files.length > 0) this.processFile(event.target.files[0], type);
    }

    handleFileDrop(file, type) {
        this.processFile(file, type);
    }

    processFile(file, type) {
        if (type === 'template') {
            this.templateFile = file;
            this.templateFileStatus.textContent = file.name;
            this.templateFileStatus.classList.add('loaded');
        } else if (type === 'smsTemplate') {
            this.smsTemplateFile = file;
            this.smsTemplateFileStatus.textContent = file.name;
            this.smsTemplateFileStatus.classList.add('loaded');
        } else if (type === 'data') {
            this.dataFile = file;
            this.dataFileStatus.textContent = file.name;
            this.dataFileStatus.classList.add('loaded');
        }

        // At least one template + data required to proceed
        const hasAtLeastOneTemplate = this.templateFile || this.smsTemplateFile;
        if (hasAtLeastOneTemplate && this.dataFile) {
            this.startProcessing();
        }
    }

    async startProcessing() {
        this.uploadSection.style.display = 'none';
        this.loadingSpinner.style.display = 'block';
        this.errorMessage.textContent = '';

        try {
            // 1. Process the Email DOCX template file (if provided)
            this.emailMergeFields = [];
            if (this.templateFile) {
                const arrayBuffer = await this.templateFile.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
                this.template = result.value;
                const textForParsing = result.value.replace(/<[^>]+>/g, ' ');
                this.emailMergeFields = [...new Set(textForParsing.match(/[\[\]]+([^[\]]+)[\[\]]+/g) || [])];
            }

            // 2. Process the SMS DOCX template file (if provided)
            this.smsMergeFields = [];
            if (this.smsTemplateFile) {
                const smsArrayBuffer = await this.smsTemplateFile.arrayBuffer();
                const smsResult = await mammoth.convertToHtml({ arrayBuffer: smsArrayBuffer });
                this.smsTemplate = smsResult.value;
                const smsTextForParsing = smsResult.value.replace(/<[^>]+>/g, ' ');
                this.smsMergeFields = [...new Set(smsTextForParsing.match(/[\[\]]+([^[\]]+)[\[\]]+/g) || [])];
            }

            // 3. Combine merge fields from both templates (deduplicated)
            this.mergeFields = [...new Set([...this.emailMergeFields, ...this.smsMergeFields])];

            // 4. Process the data file
            const dataResult = await this.dataImporter.importFile(this.dataFile);
            if (!dataResult.success) throw new Error(dataResult.error);
            this.customers = dataResult.data;

            // 5. Proceed to mapping
            this.autoMapFields();
            this.displayMappingModal();

        } catch (error) {
            this.resetUI(error.message);
        }
    }

    autoMapFields() {
        const headers = this.customers.length > 0 ? Object.keys(this.customers[0]) : [];
        this.fieldMapping = {};
        this.mergeFields.forEach(field => {
            const cleanField = field.replace(/[\\[\\]]/g, '').toLowerCase().replace(/ /g, '');
            const foundHeader = headers.find(header => header.toLowerCase().replace(/ /g, '') === cleanField);
            this.fieldMapping[field] = foundHeader || '';
        });
    }

    displayMappingModal() {
        this.loadingSpinner.style.display = 'none';
        const headers = this.customers.length > 0 ? Object.keys(this.customers[0]) : [];
        const optionsHTML = `<option value="">-- Select Column --</option>` + headers.map(h => `<option value="${h}">${h}</option>`).join('');

        this.emailColumnSelect.innerHTML = optionsHTML;
        const autoSelectedEmail = headers.find(h => h.toLowerCase().includes('email'));
        if (autoSelectedEmail) this.emailColumnSelect.value = autoSelectedEmail;

        // Populate and auto-detect phone column
        this.phoneColumnSelect.innerHTML = `<option value="">-- None (Optional) --</option>` + headers.map(h => `<option value="${h}">${h}</option>`).join('');
        const autoSelectedPhone = headers.find(h => {
            const lower = h.toLowerCase();
            return lower.includes('phone') || lower.includes('mobile') || lower.includes('cell');
        });
        if (autoSelectedPhone) this.phoneColumnSelect.value = autoSelectedPhone;

        this.mappingContainer.innerHTML = '';
        this.mergeFields.forEach(field => {
            const selectedHeader = this.fieldMapping[field];
            const row = document.createElement('div');
            row.className = 'mapping-row';
            row.innerHTML = `
                <div class="mapping-field">${field}</div>
                <div class="mapping-arrow">→</div>
                <div class="mapping-column"><select data-field="${field}">${optionsHTML}</select></div>
            `;
            this.mappingContainer.appendChild(row);
            if (selectedHeader) row.querySelector('select').value = selectedHeader;
        });

        this.mappingModal.style.display = 'flex';
    }

    finalizeMapping() {
        this.emailColumn = this.emailColumnSelect.value;
        this.phoneColumn = this.phoneColumnSelect.value;
        if (!this.emailColumn) {
            alert('Please select the column containing email addresses.');
            return;
        }

        this.mappingContainer.querySelectorAll('select').forEach(select => {
            this.fieldMapping[select.getAttribute('data-field')] = select.value;
        });

        if (Object.values(this.fieldMapping).some(val => val === '')) {
            alert('Please map all merge fields to a spreadsheet column.');
            return;
        }

        this.mappingModal.style.display = 'none';
        this.reviewSection.style.display = 'block';
        this.renderCurrentCustomer();
    }

    renderCurrentCustomer() {
        if (this.currentIndex < 0 || this.currentIndex >= this.customers.length) {
            this.reviewSection.innerHTML = '<p>No more customers.</p>';
            return;
        }

        const customer = this.customers[this.currentIndex];
        const customerEmail = this.emailColumn ? customer[this.emailColumn] : '';
        const customerPhone = this.phoneColumn ? customer[this.phoneColumn] : '';

        // Determine content sources based on loaded templates
        const hasEmailTemplate = !!this.template;
        const hasSmsTemplate = !!this.smsTemplate;

        // Determine which content to use for email and SMS
        let emailTemplateSource = this.template || this.smsTemplate;
        let smsTemplateSource = this.smsTemplate || this.template;

        // Customize the email template
        let customizedEmailHtml = emailTemplateSource;
        for (const field in this.fieldMapping) {
            const rawValue = customer[this.fieldMapping[field]];
            const value = this.formatFieldValue(rawValue, field);
            customizedEmailHtml = customizedEmailHtml.replace(new RegExp(this.escapeRegex(field), 'g'), value);
        }

        // Customize the SMS template
        let customizedSmsHtml = smsTemplateSource;
        for (const field in this.fieldMapping) {
            const rawValue = customer[this.fieldMapping[field]];
            const value = this.formatFieldValue(rawValue, field);
            customizedSmsHtml = customizedSmsHtml.replace(new RegExp(this.escapeRegex(field), 'g'), value);
        }

        // Post-process email HTML
        let processedEmailHtml = customizedEmailHtml;
        processedEmailHtml = processedEmailHtml.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');
        processedEmailHtml = processedEmailHtml.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');
        processedEmailHtml = processedEmailHtml.replace(/<p[^>]*>/gi, '<p>');

        // Apply Arial font to the email content
        const emailWithFont = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${processedEmailHtml}</div>`;
        this.emailPreviewEl.innerHTML = emailWithFont;

        // Convert SMS template to plain text
        const smsPlainText = this.stripHtmlTags(customizedSmsHtml);
        this.smsPreviewEl.textContent = smsPlainText;

        // Get the subject from the input field or use default
        const subjectInput = document.getElementById('subjectInput');
        const subject = subjectInput.value || 'Important message regarding your Membership';
        this.customerEmailEl.textContent = customerEmail || 'No email';

        // Display formatted phone number as clickable tel: link
        if (this.customerPhoneEl) {
            if (this.phoneColumn) {
                this.customerPhoneEl.parentElement.style.display = 'block';
                if (customerPhone) {
                    const displayPhone = this.formatPhoneDisplay(customerPhone);
                    const telPhone = this.formatPhoneForSms(customerPhone);
                    this.customerPhoneEl.innerHTML = `<a href="tel:${telPhone}" class="phone-link">${displayPhone}</a>`;
                    this.customerPhoneEl.classList.remove('missing-phone');
                } else {
                    this.customerPhoneEl.innerHTML = 'No phone number';
                    this.customerPhoneEl.classList.add('missing-phone');
                }
            } else {
                this.customerPhoneEl.parentElement.style.display = 'none';
            }
        }

        // Show/hide preview sections based on phone column being selected
        const showSmsPreview = !!this.phoneColumn;
        this.emailPreviewSection.style.display = 'block';
        this.smsPreviewSection.style.display = showSmsPreview ? 'block' : 'none';

        // For email links, convert the email HTML to plain text
        const emailPlainTextBody = this.emailPreviewEl.innerText || '';

        // Find the column for the customer's name from the mapping
        const nameField = Object.keys(this.fieldMapping).find(f => f.toLowerCase().includes('name'));
        const nameColumn = nameField ? this.fieldMapping[nameField] : null;
        const customerName = nameColumn ? customer[nameColumn] : '';

        // Format the 'to' field as "Full Name <email@email.com>"
        const toField = customerName && customerEmail ? `${customerName} <${customerEmail}>` : customerEmail;

        // Check contact info for button enabling
        const hasValidEmail = customerEmail && customerEmail.includes('@');
        const hasValidPhone = customerPhone && this.formatPhoneForSms(customerPhone).length >= 10;

        // Generate email links
        if (hasValidEmail) {
            const encodedSubject = encodeURIComponent(subject);
            const encodedBody = encodeURIComponent(emailPlainTextBody);
            const encodedTo = encodeURIComponent(toField);

            this.desktopBtn.href = `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;
            this.outlookLiveBtn.href = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;
            this.outlookOfficeBtn.href = `https://outlook.office.com/mail/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;

            this.desktopBtn.classList.remove('disabled');
            this.outlookLiveBtn.classList.remove('disabled');
            this.outlookOfficeBtn.classList.remove('disabled');
        } else {
            this.desktopBtn.href = '#';
            this.outlookLiveBtn.href = '#';
            this.outlookOfficeBtn.href = '#';

            this.desktopBtn.classList.add('disabled');
            this.outlookLiveBtn.classList.add('disabled');
            this.outlookOfficeBtn.classList.add('disabled');
        }

        // Generate SMS links - use SMS-specific content
        if (hasValidPhone) {
            this.smsMessagesBtn.href = this.generateSmsLink(customerPhone, customizedSmsHtml);
            this.smsRingCentralBtn.href = this.generateRingCentralLink(customerPhone, customizedSmsHtml);
            this.smsMessagesBtn.classList.remove('disabled');
            this.smsRingCentralBtn.classList.remove('disabled');
        } else {
            this.smsMessagesBtn.href = '#';
            this.smsRingCentralBtn.href = '#';
            this.smsMessagesBtn.classList.add('disabled');
            this.smsRingCentralBtn.classList.add('disabled');
        }

        // Update SMS character counter
        this.updateSmsCharCounter(smsPlainText, showSmsPreview);

        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.disabled = this.currentIndex >= this.customers.length - 1;

        // Update customer index display
        this.customerIndexEl.textContent = `${this.currentIndex + 1} of ${this.customers.length}`;
    }

    updateEmailLinks() {
        if (this.currentIndex < 0 || this.currentIndex >= this.customers.length) return;

        const customer = this.customers[this.currentIndex];
        const customerEmail = this.emailColumn ? customer[this.emailColumn] : '';

        // Check if we have a valid email
        const hasValidEmail = customerEmail && customerEmail.includes('@');
        if (!hasValidEmail) {
            // Visual feedback
            this.updateSubjectBtn.textContent = 'Updated!';
            setTimeout(() => {
                this.updateSubjectBtn.textContent = 'Update';
            }, 1500);
            return;
        }

        // Get the current subject from the input field
        const subjectInput = document.getElementById('subjectInput');
        const subject = subjectInput.value || 'Important message regarding your Membership';

        // For email links, convert the HTML to plain text
        const plainTextBody = this.emailPreviewEl.innerText || '';

        // Find the column for the customer's name from the mapping
        const nameField = Object.keys(this.fieldMapping).find(f => f.toLowerCase().includes('name'));
        const nameColumn = nameField ? this.fieldMapping[nameField] : null;
        const customerName = nameColumn ? customer[nameColumn] : '';

        // Format the 'to' field as "Full Name <email@email.com>"
        const toField = customerName ? `${customerName} <${customerEmail}>` : customerEmail;

        // Generate updated links
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(plainTextBody);
        const encodedTo = encodeURIComponent(toField);

        this.desktopBtn.href = `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;
        this.outlookLiveBtn.href = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;
        this.outlookOfficeBtn.href = `https://outlook.office.com/mail/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;

        // Visual feedback
        this.updateSubjectBtn.textContent = 'Updated!';
        setTimeout(() => {
            this.updateSubjectBtn.textContent = 'Update';
        }, 1500);
    }
    
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\\]/g, '\\$&');
    }

    isDateField(fieldName) {
        const dateKeywords = ['date', 'expir', 'due', 'renew', 'birth', 'created', 'updated'];
        const lower = fieldName.toLowerCase();
        return dateKeywords.some(keyword => lower.includes(keyword));
    }

    formatFieldValue(value, fieldName) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        // Check if this is a date field
        if (this.isDateField(fieldName)) {
            // Check if value is an Excel serial date (number between 1 and 100000)
            const numValue = Number(value);
            if (!isNaN(numValue) && numValue > 1 && numValue < 100000 && Number.isInteger(numValue) || (typeof value === 'number' && value > 1 && value < 100000)) {
                // Convert Excel serial date to JavaScript Date
                // Excel dates are days since 1900-01-01 (with a leap year bug)
                // 25569 is the number of days between 1900-01-01 and 1970-01-01
                const date = new Date((numValue - 25569) * 86400000);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
            }

            // Try parsing as a regular date string
            const dateValue = new Date(value);
            if (!isNaN(dateValue.getTime())) {
                return dateValue.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }

        return String(value);
    }

    formatPhoneDisplay(phone) {
        if (!phone) return '';
        // Strip all non-digit characters
        const digits = String(phone).replace(/\D/g, '');
        // Format as (XXX) XXX-XXXX for 10-digit US numbers
        if (digits.length === 10) {
            return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        // Format as +1 (XXX) XXX-XXXX for 11-digit numbers starting with 1
        if (digits.length === 11 && digits.startsWith('1')) {
            return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
        }
        // Return original if not standard US format
        return phone;
    }

    formatPhoneForSms(phone) {
        if (!phone) return '';
        // Strip extension (x, ext, extension followed by digits)
        let cleaned = String(phone).replace(/\s*(x|ext\.?|extension)\s*\d+$/i, '');
        // Strip all non-digit characters
        const digits = cleaned.replace(/\D/g, '');
        // Add +1 prefix for 10-digit US numbers
        if (digits.length === 10) {
            return `+1${digits}`;
        }
        // Add + prefix for 11-digit numbers starting with 1
        if (digits.length === 11 && digits.startsWith('1')) {
            return `+${digits}`;
        }
        // Return digits only for other formats
        return digits;
    }

    stripHtmlTags(html) {
        // Create a temporary element to parse HTML and extract text
        const temp = document.createElement('div');
        temp.innerHTML = html;
        return temp.textContent || temp.innerText || '';
    }

    generateSmsLink(phone, message) {
        const formattedPhone = this.formatPhoneForSms(phone);
        const plainText = this.stripHtmlTags(message);
        const encodedBody = encodeURIComponent(plainText);
        return `sms:${formattedPhone}?body=${encodedBody}`;
    }

    generateRingCentralLink(phone, message) {
        const formattedPhone = this.formatPhoneForSms(phone);
        const plainText = this.stripHtmlTags(message);
        const encodedText = encodeURIComponent(plainText);
        return `https://app.ringcentral.com/messages/compose?to=${formattedPhone}&text=${encodedText}`;
    }

    updateSmsCharCounter(message, showCounter) {
        if (!this.smsCharCounter || !this.charCountText) return;

        if (!showCounter) {
            this.smsCharCounter.style.display = 'none';
            return;
        }

        const charCount = message.length;
        this.smsCharCounter.style.display = 'block';

        // Reset classes
        this.smsCharCounter.classList.remove('warning', 'error');

        if (charCount <= 160) {
            // Single SMS
            this.charCountText.textContent = `${charCount}/160 characters`;
            if (charCount >= 140) {
                this.smsCharCounter.classList.add('warning');
            }
        } else {
            // Concatenated SMS (153 chars per segment due to headers)
            const segments = Math.ceil(charCount / 153);
            this.charCountText.textContent = `${charCount} characters (${segments} SMS)`;
            this.smsCharCounter.classList.add('error');
        }
    }

    navigate(direction) {
        const newIndex = this.currentIndex + direction;
        if (newIndex >= 0 && newIndex < this.customers.length) {
            this.currentIndex = newIndex;
            this.renderCurrentCustomer();
            // Ensure email links use current subject line
            this.updateEmailLinks();
        }
    }
    
    resetUI(message) {
        this.loadingSpinner.style.display = 'none';
        this.uploadSection.style.display = 'block';
        this.reviewSection.style.display = 'none';
        this.mappingModal.style.display = 'none';
        if(message) this.errorMessage.textContent = `Error: ${message}`;

        this.templateFile = null;
        this.smsTemplateFile = null;
        this.dataFile = null;
        this.template = '';
        this.smsTemplate = '';
        this.templateFileStatus.textContent = 'No file selected';
        this.smsTemplateFileStatus.textContent = 'No file selected';
        this.dataFileStatus.textContent = 'No file selected';
        this.templateFileStatus.classList.remove('loaded');
        this.smsTemplateFileStatus.classList.remove('loaded');
        this.dataFileStatus.classList.remove('loaded');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SimpleMailBot();
});
