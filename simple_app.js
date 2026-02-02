
class SimpleMailBot {
    constructor() {
        // DOM Elements
        this.uploadSection = document.getElementById('uploadSection');
        this.reviewSection = document.getElementById('reviewSection');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.templateDropZone = document.getElementById('templateDropZone');
        this.dataDropZone = document.getElementById('dataDropZone');
        this.templateFileInput = document.getElementById('templateFileInput');
        this.dataFileInput = document.getElementById('dataFileInput');
        this.templateFileStatus = document.getElementById('templateFileStatus');
        this.dataFileStatus = document.getElementById('dataFileStatus');
        this.errorMessage = document.getElementById('error-message');

        this.customerEmailEl = document.getElementById('customerEmail');
        this.customerPhoneEl = document.getElementById('customerPhone');
        this.emailSubjectEl = document.getElementById('emailSubject');
        this.emailPreviewEl = document.getElementById('emailPreview');
        this.customerIndexEl = document.getElementById('customerIndex');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.skipBtn = document.getElementById('skipBtn');
        this.desktopBtn = document.getElementById('desktopBtn');
        this.outlookLiveBtn = document.getElementById('outlookLiveBtn');
        this.outlookOfficeBtn = document.getElementById('outlookOfficeBtn');
        this.updateSubjectBtn = document.getElementById('updateSubjectBtn');

        // Mapping Modal Elements
        this.mappingModal = document.getElementById('mappingModal');
        this.mappingContainer = document.getElementById('mappingContainer');
        this.emailColumnSelect = document.getElementById('emailColumnSelect');
        this.phoneColumnSelect = document.getElementById('phoneColumnSelect');
        this.confirmMappingBtn = document.getElementById('confirmMappingBtn');

        // App State
        this.templateFile = null;
        this.dataFile = null;
        this.customers = [];
        this.mergeFields = [];
        this.fieldMapping = {};
        this.emailColumn = '';
        this.phoneColumn = '';
        this.template = ''; // This will now store HTML from the docx
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
        this.dataFileInput.addEventListener('change', (e) => this.handleFileSelect(e, 'data'));
        this.setupDropZone(this.templateDropZone, (file) => this.handleFileDrop(file, 'template'));
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
        } else if (type === 'data') {
            this.dataFile = file;
            this.dataFileStatus.textContent = file.name;
            this.dataFileStatus.classList.add('loaded');
        }

        if (this.templateFile && this.dataFile) {
            this.startProcessing();
        }
    }

    async startProcessing() {
        this.uploadSection.style.display = 'none';
        this.loadingSpinner.style.display = 'block';
        this.errorMessage.textContent = '';

        try {
            // 1. Process the DOCX template file
            const arrayBuffer = await this.templateFile.arrayBuffer();
            const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
            this.template = result.value; // The generated HTML
            const textForParsing = result.value.replace(/<[^>]+>/g, ' '); // Plain text for field extraction
            this.mergeFields = [...new Set(textForParsing.match(/[\[\]]+([^[\]]+)[\[\]]+/g) || [])];

            // 2. Process the data file
            const dataResult = await this.dataImporter.importFile(this.dataFile);
            if (!dataResult.success) throw new Error(dataResult.error);
            this.customers = dataResult.data;

            // 3. Proceed to mapping
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
        const customerEmail = this.emailColumn ? customer[this.emailColumn] : 'No email found';
        const customerPhone = this.phoneColumn ? customer[this.phoneColumn] : '';

        // Customize the HTML template
        let customizedHtml = this.template;
        for (const field in this.fieldMapping) {
            const value = customer[this.fieldMapping[field]] || '';
            customizedHtml = customizedHtml.replace(new RegExp(this.escapeRegex(field), 'g'), value);
        }

        // Post-process HTML to remove link formatting and ensure inline text
        let processedHtml = customizedHtml;

        // Remove link tags but keep the text content
        processedHtml = processedHtml.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');

        // Remove any span tags that might be causing formatting issues
        processedHtml = processedHtml.replace(/<span[^>]*>(.*?)<\/span>/gi, '$1');

        // Ensure proper paragraph structure
        processedHtml = processedHtml.replace(/<p[^>]*>/gi, '<p>');

        // Apply Arial font to the email content
        const emailWithFont = `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${processedHtml}</div>`;
        this.emailPreviewEl.innerHTML = emailWithFont; // Render HTML in the preview

        // Get the subject from the input field or use default
        const subjectInput = document.getElementById('subjectInput');
        const subject = subjectInput.value || 'Important message regarding your Membership';
        this.customerEmailEl.textContent = customerEmail;

        // Display formatted phone number
        if (customerPhone && this.customerPhoneEl) {
            this.customerPhoneEl.textContent = this.formatPhoneDisplay(customerPhone);
            this.customerPhoneEl.parentElement.style.display = 'block';
        } else if (this.customerPhoneEl) {
            this.customerPhoneEl.parentElement.style.display = 'none';
        }

        // For email links, convert the customized HTML to plain text
        const plainTextBody = this.emailPreviewEl.innerText || '';

        // Find the column for the customer's name from the mapping
        const nameField = Object.keys(this.fieldMapping).find(f => f.toLowerCase().includes('name'));
        const nameColumn = nameField ? this.fieldMapping[nameField] : null;
        const customerName = nameColumn ? customer[nameColumn] : '';

        // Format the 'to' field as "Full Name <email@email.com>"
        const toField = customerName ? `${customerName} <${customerEmail}>` : customerEmail;

        // Generate links
        const encodedSubject = encodeURIComponent(subject);
        const encodedBody = encodeURIComponent(plainTextBody);
        const encodedTo = encodeURIComponent(toField);

        this.desktopBtn.href = `mailto:${encodedTo}?subject=${encodedSubject}&body=${encodedBody}`;
        this.outlookLiveBtn.href = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;
        this.outlookOfficeBtn.href = `https://outlook.office.com/mail/deeplink/compose?to=${encodedTo}&subject=${encodedSubject}&body=${encodedBody}`;

        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.disabled = this.currentIndex >= this.customers.length - 1;

        // Update customer index display
        this.customerIndexEl.textContent = `${this.currentIndex + 1} of ${this.customers.length}`;
    }

    updateEmailLinks() {
        if (this.currentIndex < 0 || this.currentIndex >= this.customers.length) return;

        const customer = this.customers[this.currentIndex];
        const customerEmail = this.emailColumn ? customer[this.emailColumn] : 'No email found';

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
        this.dataFile = null;
        this.templateFileStatus.textContent = 'No file selected';
        this.dataFileStatus.textContent = 'No file selected';
        this.templateFileStatus.classList.remove('loaded');
        this.dataFileStatus.classList.remove('loaded');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SimpleMailBot();
});
