# Contact Cadence submission checklist

## Submission links

- Public repository: https://github.com/CarmineCostoya/contact-cadence
- Live app: https://carminecostoya.github.io/contact-cadence/
- Original plan and Plan vs. Reality: https://github.com/CarmineCostoya/contact-cadence/blob/main/PLAN.md
- Test evidence: https://github.com/CarmineCostoya/contact-cadence/blob/main/TEST_EVIDENCE.md
- Reflection draft: https://github.com/CarmineCostoya/contact-cadence/blob/main/REFLECTION.md
- Database documentation: https://github.com/CarmineCostoya/contact-cadence/blob/main/schema.md

## Completed repository evidence

- [x] Public repository contains no passwords, database credentials, service-role keys, or real contact data.
- [x] Original plan is preserved and its Plan vs. Reality table is complete.
- [x] Prompt logs are saved in `prompts/`.
- [x] Required data-isolation test includes plain-English, red, green, and “what breaks it” evidence.
- [x] Required dashboard test includes plain-English, red, green, and “what breaks it” evidence.
- [x] Stranger-test tag correction was completed in PR #6.
- [x] Month/year Date met correction was completed in PR #15.
- [x] Interaction editing was completed in PR #16.
- [x] At least nine visible pull requests exist after the submission-checklist PR is merged.
- [x] Every final corrective branch includes a matching prompt log and closes its Issue.

## Manual steps for Carmine before submission

- [ ] Open the live app and log in to the account containing the five real, non-sensitive contacts.
- [ ] Confirm the dashboard, contacts, tags, stars, interactions, reminders, and CSV export still work on the deployed URL.
- [ ] Confirm the Date met control asks for month/year and an interaction can be edited.
- [ ] Create a second temporary account and repeat the deployed two-account isolation check; remove only temporary test data afterward.
- [ ] Take one dashboard screenshot while logged in. Do not expose confidential notes or another person’s sensitive information.
- [ ] Save or upload that screenshot where the assignment requests it. Suggested filename: `contact-cadence-dashboard.png`.
- [ ] Read both sections of `REFLECTION.md`, rewrite any sentence that is not in your own voice, and confirm each remains 400–600 words.
- [ ] Confirm the assigned group presenter by **November 2**.
- [ ] Paste the repository URL, live app URL, plan URL, screenshot, and reflection into the required bCourses submission fields.
- [ ] Submit before class on **November 4**.

## Final deployed smoke test

Run this after the last GitHub Pages deployment finishes:

1. Open the live URL in a private/incognito window.
2. Create a temporary account with an email address you control, or log in with the designated test account.
3. Refresh the page and confirm the login persists.
4. Create a contact with tags and a month/year Date met value.
5. Add, edit, and delete an interaction.
6. Star and unstar the contact; verify the starred filter.
7. Exercise search, tag, reminder, and sort controls.
8. Export CSV and open it in a spreadsheet.
9. Log out and confirm private routes return to the login page.
10. Log back into the main demo account and confirm its five real contacts persist.

## Five-minute demo script

### 0:00–0:35 — Pitch and privacy

“Contact Cadence helps me remember professional relationships, what we discussed, and when I should reconnect. Each account sees only its own data.” Briefly show signup or the login screen, then use the prepared demo account.

### 0:35–1:25 — Personal directory

Show the contact list with at least five real, non-sensitive entries. Point out search, sorting, follow-up filters, tags, and stars. Open one contact that has safe demo content.

### 1:25–2:20 — Relationship history

Show the month/year Date met value, tags, follow-up date, and interaction timeline. Add or edit one short interaction to demonstrate that relationship history is maintainable.

### 2:20–3:10 — Dashboard and reminders

Open the dashboard. Explain total contacts, overdue follow-ups, interactions this month, the six-month chart, and the overdue/today/upcoming queue.

### 3:10–4:15 — Audience-selected action

Ask the audience to choose one action: search for a person or organization, filter by a tag, star a contact, or schedule a follow-up. Perform the selected action live.

### 4:15–5:00 — Architecture and close

Explain that GitHub Pages hosts the React app for free, Supabase provides authentication and PostgreSQL, and Row Level Security keeps data private. Mention spreadsheet-safe CSV export, then leave time for one short question.

## Demo safety reminders

- Use only non-sensitive contact information and notes.
- Keep a logged-in demo tab ready, but rehearse login in case the session expires.
- Do not display Supabase keys, repository secrets, or personal email inboxes.
- Keep a dashboard screenshot available as a fallback if the network is slow.
