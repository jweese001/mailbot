# TASKS.md

Actionable tasks derived from [PLANNING.md](PLANNING.md).

---

## v2.0 - SMS Messaging

### Phone Column Support
- [x] Add `phoneColumn` state variable to SimpleMailBot class
- [x] Add phone column dropdown to mapping modal (below email selector)
- [x] Auto-detect columns containing "phone", "mobile", "cell"
- [x] Display phone number in review section: `Phone: (772) 555-1234`

### Apple Messages Integration
- [x] Add "SMS (Messages)" button to action controls div
- [x] Create `generateSmsLink()` method returning `sms:{phone}?body={message}`
- [x] Strip HTML tags from message body for SMS
- [x] URL-encode message body

### RingCentral Integration
- [x] Add "SMS (RingCentral)" button to action controls div
- [x] Create `generateRingCentralLink()` method
- [x] Format: `https://app.ringcentral.com/messages/compose?to={phone}&text={message}`

### Phone Number Formatting
- [x] Create `formatPhoneForSms()` utility function
- [x] Strip all non-digit characters
- [x] Add +1 prefix if 10 digits (US number)
- [x] Validate length (10-15 digits)

### SMS Preview
- [x] Add character counter below email preview
- [x] Show: `{count}/160 characters` or `{count} characters ({segments} SMS)`
- [x] Yellow warning at 140+ chars, red at 160+
- [x] Calculate segments: `Math.ceil(count / 153)` for concatenated SMS

### Validation & Edge Cases
- [x] Flag recipients with missing phone numbers
- [x] Disable SMS buttons when no valid phone
- [x] Handle phone numbers with extensions (strip extension)

---

## Backlog (v2.1+)

- [ ] Keyboard shortcuts: ← Previous, → Next, Enter Send
- [ ] Session preferences (last-used send method)
- [ ] Campaign log export (CSV: name, email, phone, timestamp)
- [ ] Separate SMS template upload (optional)
- [ ] Batch skip invalid recipients

---

## Completed

### v1.0 - Email Campaigns
- [x] DOCX template upload with Mammoth.js
- [x] CSV/Excel import with PapaParse/SheetJS
- [x] Field mapping modal with auto-detection
- [x] Email preview with navigation
- [x] Outlook web deeplinks (personal & work)
- [x] Desktop mailto: links

---

## How to Use This File

1. Pick a task from the current version section
2. Mark it `[~]` when in progress
3. Mark it `[x]` when complete and move to Completed section
4. Commit with task reference: `git commit -m "Add phone column selector"`
