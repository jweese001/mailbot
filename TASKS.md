# TASKS.md

Actionable tasks derived from [PLANNING.md](PLANNING.md).

---

## v2.0 - SMS Messaging

### Phone Column Support
- [ ] Add `phoneColumn` state variable to SimpleMailBot class
- [ ] Add phone column dropdown to mapping modal (below email selector)
- [ ] Auto-detect columns containing "phone", "mobile", "cell"
- [ ] Display phone number in review section: `Phone: (772) 555-1234`

### Apple Messages Integration
- [ ] Add "SMS (Messages)" button to action controls div
- [ ] Create `generateSmsLink()` method returning `sms:{phone}?body={message}`
- [ ] Strip HTML tags from message body for SMS
- [ ] URL-encode message body

### RingCentral Integration
- [ ] Add "SMS (RingCentral)" button to action controls div
- [ ] Create `generateRingCentralLink()` method
- [ ] Format: `https://app.ringcentral.com/messages/compose?to={phone}&text={message}`

### Phone Number Formatting
- [ ] Create `formatPhoneForSms()` utility function
- [ ] Strip all non-digit characters
- [ ] Add +1 prefix if 10 digits (US number)
- [ ] Validate length (10-15 digits)

### SMS Preview
- [ ] Add character counter below email preview
- [ ] Show: `{count}/160 characters` or `{count} characters ({segments} SMS)`
- [ ] Yellow warning at 140+ chars, red at 160+
- [ ] Calculate segments: `Math.ceil(count / 153)` for concatenated SMS

### Validation & Edge Cases
- [ ] Flag recipients with missing phone numbers
- [ ] Disable SMS buttons when no valid phone
- [ ] Handle phone numbers with extensions (strip extension)

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
