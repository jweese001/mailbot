# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MailBot is a client-side bulk email campaign manager that runs entirely in the browser. It allows users to:
1. Upload a DOCX email template with merge fields (e.g., `[Full Name]`, `[Expiration Date]`)
2. Upload customer data from CSV or Excel files
3. Map merge fields to spreadsheet columns
4. Preview personalized emails and open them in Outlook (web or desktop app)

**Key constraint**: All processing happens locally in the browser - no server-side component.

## Architecture

```
MailBot.html          - Main entry point, loads all scripts and defines UI structure
simple_app.js         - SimpleMailBot class: main controller, handles UI events and orchestration
js/
  data-importer.js    - CustomerDataImporter class: parses CSV (PapaParse) and Excel (SheetJS) files
  message-engine.js   - MessageCustomizer class: replaces merge fields with customer data
  utils.js            - Utility functions (debounce, validation, formatting helpers)
libs/
  papaparse.min.js    - CSV parsing library
  xlsx.full.min.js    - Excel parsing library (SheetJS)
```

## Key Classes

- **SimpleMailBot** (`simple_app.js`): Main application controller. Manages file uploads, field mapping modal, email preview navigation, and generates mailto/Outlook links.

- **CustomerDataImporter** (`js/data-importer.js`): Handles file reading via FileReader API. Auto-detects header rows in Excel files (looks for rows with 3+ non-empty cells in first 25 rows). Uses PapaParse for CSV and SheetJS for XLSX.

- **MessageCustomizer** (`js/message-engine.js`): Performs merge field replacement using regex. Auto-formats values based on field type (dates, names, emails, phone numbers).

## Merge Field Format

Templates use bracket notation: `[Field Name]`. The regex pattern `[\[\]]+([^[\]]+)[\[\]]+` extracts these fields from DOCX content converted to HTML via Mammoth.js.

## External Dependencies

- **Mammoth.js** (CDN): Converts DOCX to HTML
- **PapaParse** (local): CSV parsing with auto-delimiter detection
- **SheetJS/xlsx** (local): Excel file parsing

## Styling

- `dark-theme.css` - Main dark theme styles
- `simple.css` - Additional component styles
