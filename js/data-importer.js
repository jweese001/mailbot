/**
 * Customer Data Importer
 * Handles importing and processing customer data from CSV and Excel files
 */

class CustomerDataImporter {
    constructor() {
        this.rawData = [];
        this.processedData = [];
        this.columnHeaders = [];
        this.metadata = {};
        
        // Configuration for PapaParse
        this.csvConfig = {
            header: true,
            skipEmptyLines: true,
            delimitersToGuess: [',', '\t', '|', ';'],
            dynamicTyping: true,
            transformHeader: (header) => this.cleanHeader(header),
            error: (error, file) => {
                console.error('CSV parsing error:', error);
            }
        };
    }

    /**
     * Import file (CSV or Excel)
     * @param {File} file - File to import
     * @returns {Promise<Object>} - Import result
     */
    async importFile(file) {
        try {
            if (!file) {
                return {
                    success: false,
                    error: 'No file provided'
                };
            }

            console.log('Starting data import:', file.name, file.type);

            // Determine file type and process accordingly
            if (file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')) {
                return await this.importCSV(file);
            } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                       file.name.toLowerCase().endsWith('.xlsx')) {
                return await this.importExcel(file);
            } else {
                return {
                    success: false,
                    error: 'Unsupported file type. Please provide a CSV or Excel (.xlsx) file.'
                };
            }

        } catch (error) {
            console.error('Data import error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Import CSV file using PapaParse
     * @param {File} file - CSV file to import
     * @returns {Promise<Object>} - Import result
     */
    async importCSV(file) {
        return new Promise((resolve) => {
            if (typeof Papa === 'undefined') {
                resolve({
                    success: false,
                    error: 'PapaParse library is not loaded. Cannot process CSV files.'
                });
                return;
            }

            console.log('Processing CSV file...');

            Papa.parse(file, {
                ...this.csvConfig,
                complete: (results) => {
                    try {
                        const processedResult = this.processCSVResults(results, file);
                        resolve(processedResult);
                    } catch (error) {
                        console.error('CSV processing error:', error);
                        resolve({
                            success: false,
                            error: 'Failed to process CSV data: ' + error.message
                        });
                    }
                },
                error: (error) => {
                    console.error('Papa Parse error:', error);
                    resolve({
                        success: false,
                        error: 'CSV parsing failed: ' + error.message
                    });
                }
            });
        });
    }

    /**
     * Import Excel file using SheetJS
     * @param {File} file - Excel file to import
     * @returns {Promise<Object>} - Import result
     */
    async importExcel(file) {
        if (typeof XLSX === 'undefined') {
            return {
                success: false,
                error: 'SheetJS library is not loaded. Cannot process Excel files.'
            };
        }

        try {
            console.log('Processing Excel file...');
            let workbook;

            try {
                // First attempt: Read file as array buffer
                console.log('Attempting to read Excel file as ArrayBuffer...');
                const arrayBuffer = await this.fileToArrayBuffer(file);
                workbook = XLSX.read(arrayBuffer, { type: 'array' });
            } catch (e) {
                console.warn('Reading as ArrayBuffer failed, trying binary string...', e);
                // Fallback attempt: Read file as binary string
                try {
                    const binaryString = await this.fileToBinaryString(file);
                    workbook = XLSX.read(binaryString, { type: 'binary' });
                } catch (finalError) {
                    console.error('Excel import error after fallback:', finalError);
                    // If both methods fail, throw a more specific error
                    throw new Error('The file could not be parsed. It might be corrupt or in an unsupported format.');
                }
            }
            
            if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                return {
                    success: false,
                    error: 'Excel file contains no worksheets.'
                };
            }

            let bestSheet = null;
            let maxRows = -1;

            // Find the sheet with the most data
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                if (jsonData.length > maxRows) {
                    maxRows = jsonData.length;
                    bestSheet = sheetName;
                }
            });

            if (!bestSheet) {
                return {
                    success: false,
                    error: 'Could not find a worksheet with data.'
                };
            }

            const worksheetName = bestSheet;
            const worksheet = workbook.Sheets[worksheetName];
            
            console.log(`Found ${workbook.SheetNames.length} sheets. Processing worksheet with most data: "${worksheetName}" (${maxRows} rows)`);

            // Convert to JSON with header handling
            const jsonData = this.convertExcelToJSON(worksheet);
            
            if (!jsonData || jsonData.length === 0) {
                return {
                    success: false,
                    error: 'No data found in Excel file.'
                };
            }

            // Process the data
            const processedResult = this.processExcelData(jsonData, file, worksheetName);
            return processedResult;

        } catch (error) {
            console.error('Excel import error:', error);
            return {
                success: false,
                error: this.getErrorMessage(error)
            };
        }
    }

    /**
     * Convert File to ArrayBuffer
     * @param {File} file - File to convert
     * @returns {Promise<ArrayBuffer>} - Array buffer representation
     */
    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = function(event) {
                resolve(event.target.result);
            };
            
            reader.onerror = function(error) {
                reject(new Error('Failed to read file: ' + error.message));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Convert File to Binary String (for fallback)
     * @param {File} file - File to convert
     * @returns {Promise<string>} - Binary string representation
     */
    fileToBinaryString(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                resolve(event.target.result);
            };
            reader.onerror = function(error) {
                reject(new Error('Failed to read file: ' + error.message));
            };
            reader.readAsBinaryString(file);
        });
    }

    /**
     * Convert Excel worksheet to JSON
     * @param {Object} worksheet - XLSX worksheet object
     * @returns {Array} - JSON data array
     */
    convertExcelToJSON(worksheet) {
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Get all rows as arrays
            defval: '',
            blankrows: false
        });

        if (jsonData.length === 0) {
            return [];
        }

        let headerRowIndex = -1;
        let headers = [];

        // Try to find a header row with at least 3 non-empty cells in the first 25 rows
        for (let i = 0; i < Math.min(jsonData.length, 25); i++) {
            const row = jsonData[i];
            const nonEmptyCount = row.filter(cell => cell && String(cell).trim()).length;
            if (nonEmptyCount >= 3) {
                headerRowIndex = i;
                headers = row.map(header => this.cleanHeader(header));
                console.log(`Header row found at index ${i}:`, headers);
                break;
            }
        }

        if (headerRowIndex === -1) {
            console.warn("Could not automatically detect a header row. Using first row as default.");
            headerRowIndex = 0;
            headers = jsonData[0].map(header => this.cleanHeader(header));
        }

        const dataRows = jsonData.slice(headerRowIndex + 1);

        const processedData = dataRows.map(row => {
            const rowObj = {};
            headers.forEach((header, index) => {
                // Use a default "Unknown_X" if header is empty
                const finalHeader = header || `Unknown_${index}`;
                rowObj[finalHeader] = this.cleanValue(row[index]);
            });
            return rowObj;
        }).filter(row => this.isValidRow(row));

        return processedData;
    }

    /**
     * Process CSV parsing results
     * @param {Object} results - PapaParse results object
     * @param {File} file - Original file
     * @returns {Object} - Processed result
     */
    processCSVResults(results, file) {
        console.log('CSV parsing completed:', results);

        if (results.errors && results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
        }

        if (!results.data || results.data.length === 0) {
            return {
                success: false,
                error: 'No data found in CSV file.'
            };
        }

        // Filter out empty rows
        const validData = results.data.filter(row => this.isValidRow(row));

        if (validData.length === 0) {
            return {
                success: false,
                error: 'No valid data rows found in CSV file.'
            };
        }

        // Store processed data
        this.rawData = results.data;
        this.processedData = validData;
        this.columnHeaders = Object.keys(validData[0]);
        this.metadata = {
            fileName: file.name,
            fileType: 'CSV',
            totalRows: results.data.length,
            validRows: validData.length,
            columns: this.columnHeaders.length,
            processedAt: new Date().toISOString(),
            parseErrors: results.errors || []
        };

        console.log(`CSV processed: ${validData.length} valid rows, ${this.columnHeaders.length} columns`);
        console.log('Columns:', this.columnHeaders);

        return {
            success: true,
            data: validData,
            preview: validData.slice(0, 5),
            headers: this.columnHeaders,
            metadata: this.metadata
        };
    }

    /**
     * Process Excel data
     * @param {Array} jsonData - Converted JSON data
     * @param {File} file - Original file
     * @param {string} worksheetName - Worksheet name
     * @returns {Object} - Processed result
     */
    processExcelData(jsonData, file, worksheetName) {
        const validData = jsonData.filter(row => this.isValidRow(row));

        if (validData.length === 0) {
            return {
                success: false,
                error: 'No valid data rows found in Excel file.'
            };
        }

        // Store processed data
        this.rawData = jsonData;
        this.processedData = validData;
        this.columnHeaders = Object.keys(validData[0]);
        this.metadata = {
            fileName: file.name,
            fileType: 'Excel',
            worksheetName: worksheetName,
            totalRows: jsonData.length,
            validRows: validData.length,
            columns: this.columnHeaders.length,
            processedAt: new Date().toISOString()
        };

        console.log(`Excel processed: ${validData.length} valid rows, ${this.columnHeaders.length} columns`);
        console.log('Columns:', this.columnHeaders);

        return {
            success: true,
            data: validData,
            preview: validData.slice(0, 5),
            headers: this.columnHeaders,
            metadata: this.metadata
        };
    }

    /**
     * Clean and normalize column headers
     * @param {string} header - Raw header value
     * @returns {string} - Cleaned header
     */
    cleanHeader(header) {
        if (!header || typeof header !== 'string') {
            return 'Unknown';
        }

        return header
            .toString()
            .trim()
            .replace(/\s+/g, ' ') // Multiple spaces to single space
            .replace(/[^\w\s-]/g, '') // Remove special characters except dash
            .trim();
    }

    /**
     * Clean and normalize cell values
     * @param {*} value - Raw cell value
     * @returns {*} - Cleaned value
     */
    cleanValue(value) {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'string') {
            return value.trim();
        }

        // Handle dates
        if (value instanceof Date) {
            return value.toLocaleDateString();
        }

        // Handle numbers
        if (typeof value === 'number') {
            return value;
        }

        return String(value).trim();
    }

    /**
     * Check if a data row is valid (contains meaningful data)
     * @param {Object} row - Data row to validate
     * @returns {boolean} - True if row is valid
     */
    isValidRow(row) {
        if (!row || typeof row !== 'object') {
            return false;
        }

        // Count non-empty values
        const nonEmptyValues = Object.values(row).filter(value => 
            value !== null && 
            value !== undefined && 
            String(value).trim() !== ''
        );

        // Row is valid if it has at least 2 non-empty values
        return nonEmptyValues.length >= 2;
    }

    /**
     * Auto-map merge fields to data columns
     * @param {Array<string>} mergeFields - Array of merge field names
     * @returns {Object} - Mapping object
     */
    autoMapFields(mergeFields) {
        if (!mergeFields || !this.columnHeaders) {
            return {};
        }

        const mapping = {};

        mergeFields.forEach(mergeField => {
            // Clean merge field name for matching
            const cleanFieldName = mergeField
                .replace(/^\[|\]$/g, '') // Remove brackets
                .toLowerCase()
                .trim();

            // Find matching column header
            const matchedColumn = this.findBestColumnMatch(cleanFieldName);
            
            if (matchedColumn) {
                mapping[mergeField] = matchedColumn;
                console.log(`Auto-mapped: ${mergeField} → ${matchedColumn}`);
            }
        });

        return mapping;
    }

    /**
     * Find best matching column for a merge field
     * @param {string} fieldName - Cleaned field name to match
     * @returns {string|null} - Best matching column or null
     */
    findBestColumnMatch(fieldName) {
        if (!fieldName || !this.columnHeaders) {
            return null;
        }

        const normalizedFieldName = fieldName.toLowerCase().replace(/\s+/g, '');

        // Exact match (case insensitive)
        let exactMatch = this.columnHeaders.find(header => 
            header.toLowerCase().replace(/\s+/g, '') === normalizedFieldName
        );
        if (exactMatch) return exactMatch;

        // Partial match - field name contains column name
        let partialMatch = this.columnHeaders.find(header => {
            const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
            return normalizedFieldName.includes(normalizedHeader) || 
                   normalizedHeader.includes(normalizedFieldName);
        });
        if (partialMatch) return partialMatch;

        // Fuzzy match for common field mappings
        const commonMappings = {
            'fullname': ['name', 'customer', 'client', 'full name', 'customer name'],
            'firstname': ['first', 'fname', 'first name'],
            'lastname': ['last', 'lname', 'last name', 'surname'],
            'email': ['email', 'e-mail', 'mail', 'email address'],
            'phone': ['phone', 'telephone', 'cell', 'mobile', 'contact'],
            'address': ['address', 'street', 'location'],
            'date': ['date', 'expiration', 'expire', 'due', 'renewal']
        };

        for (const [fieldType, variations] of Object.entries(commonMappings)) {
            if (normalizedFieldName.includes(fieldType)) {
                for (const variation of variations) {
                    const match = this.columnHeaders.find(header =>
                        header.toLowerCase().includes(variation)
                    );
                    if (match) return match;
                }
            }
        }

        return null;
    }

    /**
     * Validate data completeness for required fields
     * @param {Array<string>} requiredFields - Array of required field names
     * @returns {Object} - Validation result
     */
    validateDataCompleteness(requiredFields) {
        if (!requiredFields || !this.processedData) {
            return { isValid: true, missingData: [] };
        }

        const missingData = [];

        this.processedData.forEach((row, index) => {
            const missing = requiredFields.filter(field => {
                const value = row[field];
                return !value || String(value).trim() === '';
            });

            if (missing.length > 0) {
                missingData.push({
                    rowIndex: index,
                    missingFields: missing,
                    rowData: row
                });
            }
        });

        return {
            isValid: missingData.length === 0,
            missingData: missingData,
            completenessRate: ((this.processedData.length - missingData.length) / this.processedData.length * 100).toFixed(1)
        };
    }

    /**
     * Get import statistics
     * @returns {Object} - Statistics object
     */
    getStatistics() {
        return {
            totalRecords: this.rawData.length,
            validRecords: this.processedData.length,
            columnCount: this.columnHeaders.length,
            headers: this.columnHeaders,
            metadata: this.metadata,
            validationRate: this.rawData.length > 0 ? 
                (this.processedData.length / this.rawData.length * 100).toFixed(1) : 0
        };
    }

    /**
     * Get user-friendly error message
     * @param {Error} error - Error object
     * @returns {string} - User-friendly error message
     */
    getErrorMessage(error) {
        if (!error) {
            return 'Unknown error occurred';
        }

        const message = error.message || error.toString();

        // File reading errors
        if (message.includes('Failed to read file')) {
            return 'Unable to read the file. The file may be corrupted or in use.';
        }

        // Excel-specific errors
        if (message.includes('ZIP') || message.includes('format')) {
            return 'Invalid Excel file format. Please ensure the file is a valid .xlsx file.';
        }

        // CSV-specific errors
        if (message.includes('delimiter')) {
            return 'Unable to detect CSV format. Please ensure the file uses standard delimiters (comma, tab, semicolon).';
        }

        // Memory errors
        if (error.name === 'RangeError' || message.includes('memory')) {
            return 'File is too large to process. Please try a smaller file or split the data.';
        }

        // Network errors
        if (message.includes('NetworkError')) {
            return 'Network error while loading data processing libraries. Please check your internet connection.';
        }

        return `Data import failed: ${message}`;
    }

    /**
     * Reset importer state
     */
    reset() {
        this.rawData = [];
        this.processedData = [];
        this.columnHeaders = [];
        this.metadata = {};
        console.log('Data importer state reset');
    }

    /**
     * Get current importer status
     * @returns {Object} - Current status
     */
    getStatus() {
        return {
            hasData: this.processedData.length > 0,
            recordCount: this.processedData.length,
            columnCount: this.columnHeaders.length,
            headers: this.columnHeaders,
            metadata: this.metadata
        };
    }

    async debugExcelFile(file) {
        if (typeof XLSX === 'undefined') {
            console.error('SheetJS library is not loaded.');
            return;
        }
        try {
            console.log('--- STARTING EXCEL DEBUG --- ');
            const arrayBuffer = await this.fileToArrayBuffer(file);
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            console.log('--- RAW DATA FROM SHEETJS --- ');
            console.log(rawJson);
            console.log('--- END OF EXCEL DEBUG --- ');
            alert('Debug complete. Please copy the console output.');
        } catch (e) {
            console.error('An error occurred during debugging:', e);
        }
    }
}