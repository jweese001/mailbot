# PLANNING.md

Strategic planning for MailBot development.

---

## Vision

MailBot helps Sea Tow franchise operators re-engage lapsed members through personalized outreach. The app must remain simple, private (client-side only), and fast to use during busy seasons.

---

## v1.0 - Email Campaigns (Complete)

The current release supports bulk email campaigns:
- DOCX template upload with merge field extraction
- CSV/Excel customer data import
- Field mapping with auto-detection
- Email preview with Outlook web and desktop app integration

---

## v2.0 - SMS Messaging

### Goal
Add SMS capability to improve response rates. Email open rates are ~25%; SMS open rates are ~98%.

### Approach
Use URI schemes and web deeplinks to open SMS composition in external apps. This maintains the client-side-only architecture.

### Supported Platforms
1. **Apple Messages** - `sms:` URI scheme, works on macOS/iOS
2. **RingCentral** - Web deeplink to compose interface

### Key Decisions
- Phone column must be explicitly selected (like email column)
- SMS body is plain text (HTML stripped from template)
- Character counter helps users stay within SMS limits
- No new template format; reuse existing DOCX with plain text conversion

### Constraints
- Cannot send SMS programmatically (requires user to click send in external app)
- Cannot track SMS delivery status
- RingCentral requires user to be logged into web app

---

## v2.1 - Quality of Life (Future)

### Goals
- Faster campaign workflow
- Better error handling
- Improved usability

### Candidates
- Keyboard shortcuts for navigation
- Remember preferences per session
- Export campaign log
- Separate SMS template (shorter copy)
- Batch skip for invalid recipients

---

## v3.0 - Additional Channels (Future)

### Candidates
- WhatsApp Business (`whatsapp:` URI)
- Facebook Messenger
- Direct mail merge (PDF export)

### Requirements TBD
- Evaluate URI scheme support
- Research business account requirements
- Assess user demand

---

## Technical Principles

1. **Client-side only** - No server, no data transmission, no accounts
2. **Progressive enhancement** - Core email flow works; SMS is additive
3. **Minimal dependencies** - Only add libraries when necessary
4. **User controls send** - We compose, user clicks send in their app

---

## Success Metrics

| Version | Metric | Target |
|---------|--------|--------|
| v2.0 | SMS buttons functional | 100% |
| v2.0 | Phone validation accuracy | >95% |
| v2.0 | User workflow time | <2 min per recipient |
| v2.1 | Campaign completion rate | +20% vs v1.0 |
