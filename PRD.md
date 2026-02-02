# Product Requirements Document: MailBot

## Overview

MailBot is a browser-based bulk email campaign manager designed for Sea Tow franchise operators to send personalized membership renewal reminders. The application runs entirely client-side, ensuring customer data never leaves the user's device.

---

## Current Features (v1.0)

### 1. Email Template Upload
- **Supported format**: Microsoft Word (.docx)
- **Merge field syntax**: Bracket notation (e.g., `[Full Name]`, `[Date]`)
- **Processing**: Mammoth.js converts DOCX to HTML, preserving basic formatting

### 2. Customer Data Import
- **Supported formats**: CSV, Excel (.xlsx)
- **Auto-detection**: Header row detection (scans first 25 rows for row with 3+ non-empty cells)
- **Delimiter support**: Comma, tab, pipe, semicolon (auto-detected for CSV)

### 3. Field Mapping
- **Auto-mapping**: Attempts to match merge fields to column headers by name similarity
- **Manual override**: User can select correct column for each merge field via dropdown
- **Email column selection**: Dedicated selector for identifying the email address column

### 4. Email Preview & Send
- **Navigation**: Previous/Next buttons to review each recipient's personalized message
- **Skip functionality**: Skip individual recipients
- **Subject line**: Editable subject with "Update" button to regenerate links
- **Send options**:
  - Desktop mail app (mailto: link)
  - Outlook Personal (outlook.live.com deeplink)
  - Outlook Work/School (outlook.office.com deeplink)

### 5. Privacy & Security
- All processing occurs client-side in the browser
- No data transmitted to external servers
- No data persistence between sessions

---

## Proposed Feature: SMS Messaging (v2.0)

### Problem Statement
Email open rates for renewal reminders average 20-30%. SMS messages have 98% open rates and are read within 3 minutes on average. Adding SMS capability will improve member re-engagement.

### Feature Requirements

#### 2.1 SMS Provider Integration

**Option A: RingCentral**
- Requires RingCentral account with SMS-enabled number
- Uses RingCentral web interface deeplink or OAuth-based API
- Supports business phone numbers (better for franchise operations)

**Option B: Apple Messages (iMessage/SMS)**
- Uses `sms:` URI scheme for native Messages app
- Zero configuration required
- Limited to macOS/iOS users
- Sends from user's personal phone number

#### 2.2 UI Changes

**Upload Section**
- No changes required (same template and data upload flow)

**Field Mapping Modal**
- Add "Phone Column" selector (similar to existing Email Column selector)
- Auto-detect columns containing "phone", "mobile", "cell", "sms"

**Review & Send Section**
- Display phone number alongside email: `To: email@example.com | (772) 555-1234`
- Add new action buttons:
  - "Send SMS (Messages)" - Apple Messages deeplink
  - "Send SMS (RingCentral)" - RingCentral web deeplink
- SMS body uses plain text version of template (strip HTML)
- Character counter for SMS (160 char standard / 70 char with Unicode)

#### 2.3 SMS Template Considerations

**Character Limits**
- Standard SMS: 160 characters
- Concatenated SMS: 153 chars per segment (up to 10 segments)
- Display warning if message exceeds 160 characters
- Display segment count for long messages

**Content Adaptation**
- Strip HTML formatting
- Convert line breaks to single spaces or keep as newlines (configurable)
- Truncate or warn if template exceeds recommended length
- Provide SMS-specific template preview

#### 2.4 Technical Implementation

**Apple Messages Integration**
```
sms:{phone}?body={encoded_message}
```
- Phone number formatting: Strip to digits, add country code if missing
- Message encoding: URL-encode the personalized message body

**RingCentral Integration**
```
https://app.ringcentral.com/messages/compose?to={phone}&text={encoded_message}
```
- Requires user to be logged into RingCentral web app
- Alternative: RingCentral API integration (requires OAuth, server component)

#### 2.5 Data Validation

- Validate phone numbers (10-15 digits after stripping formatting)
- Flag invalid/missing phone numbers in preview
- Support multiple phone formats: (772) 555-1234, 772-555-1234, 7725551234, +1-772-555-1234

#### 2.6 User Preferences (Future)

- Default SMS provider selection
- Country code preference (default: +1 for US)
- SMS character limit warning threshold

---

## Success Metrics

| Metric | Current (Email Only) | Target (With SMS) |
|--------|---------------------|-------------------|
| Messages sent per session | ~50 | ~100 |
| Member response rate | 15% | 35% |
| Time per campaign | 2 hours | 1.5 hours |

---

## Out of Scope (v2.0)

- Automated sending (batch SMS)
- Two-way SMS conversation tracking
- SMS delivery status tracking
- MMS (multimedia messages)
- WhatsApp or other messaging platforms
- Server-side API integration (maintains client-side only architecture)

---

## Timeline

| Phase | Description |
|-------|-------------|
| Phase 1 | Add phone column selector to field mapping |
| Phase 2 | Implement Apple Messages (`sms:`) deeplink |
| Phase 3 | Implement RingCentral web deeplink |
| Phase 4 | Add SMS preview with character counter |
| Phase 5 | Phone number validation and formatting |

---

## Appendix: URI Schemes

### Email
```
mailto:{to}?subject={subject}&body={body}
```

### Outlook Web (Personal)
```
https://outlook.live.com/mail/0/deeplink/compose?to={to}&subject={subject}&body={body}
```

### Outlook Web (Work/School)
```
https://outlook.office.com/mail/deeplink/compose?to={to}&subject={subject}&body={body}
```

### Apple Messages
```
sms:{phone}?body={message}
```

### RingCentral Web
```
https://app.ringcentral.com/messages/compose?to={phone}&text={message}
```
