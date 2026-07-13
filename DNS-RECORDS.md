# DNS records to ADD for thetrailerteam.com

**Where:** these must be added in the DNS panel that manages the domain, which is the
**rentyshop** platform (nameservers ns1/ns2.rentyshop.com), NOT GoDaddy. GoDaddy edits
are ignored while the nameservers point to rentyshop.

**Two rules to avoid any problems:**
1. **ADD these records only. Do not edit or delete any existing record.**
2. **Do NOT change the nameservers.** Leave them on rentyshop.

Existing records that must stay exactly as they are: the root `A` (51.81.93.142),
`www`, the `MX` (Mail Baby), and the current root SPF `TXT`. None of the records below
replace those; they sit alongside them.

---

## Group 1 - Email (add now; turns on sending from storage@thetrailerteam.com)

| # | Type | Host / Name | Value | Priority | TTL |
|---|------|-------------|-------|----------|-----|
| 1 | TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCd04qZeM167+oIo7jk4cTQ/6arngwoBq6ZiwGJDsubecwkzp85crzSnsNbiap7ydxa8gM2SeMIq1UJggcznHVurgxUA1Em+NO8pQ9oVuCQWEPkt8y+ksye6YlKN3HS2p8TzZzLorD7StttQpnthPLyeEnH/3qeZfUtWe0GyI+YRQIDAQAB` | (none) | Auto / 3600 |
| 2 | MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 | Auto / 3600 |
| 3 | TXT | `send` | `v=spf1 include:amazonses.com ~all` | (none) | Auto / 3600 |

## Group 2 - App subdomain (add at launch, points storage.thetrailerteam.com at the app)

| # | Type | Host / Name | Value | Priority | TTL |
|---|------|-------------|-------|----------|-----|
| 4 | CNAME | `storage` | `cname.vercel-dns.com` | (none) | Auto / 3600 |

---

### Notes for whoever enters these
- The **Host / Name** column is the left part only; the panel appends `.thetrailerteam.com`.
  If the panel wants the full name, use `resend._domainkey.thetrailerteam.com`, `send.thetrailerteam.com`, `storage.thetrailerteam.com`.
- Record #3 (SPF for the `send` subdomain) is separate from the existing root SPF. Both
  should exist. Do **not** merge them and do **not** add a second SPF on the root.
- After Groups 1 is in, we click "Verify" in Resend and email starts working (usually
  minutes, up to an hour for DNS to propagate).
- Group 2 can wait until we deploy the app. Vercel will confirm the exact CNAME target
  when the domain is added there; `cname.vercel-dns.com` is the standard value.
