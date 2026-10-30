# Required Test Evidence

## Data isolation

**Plain-English explanation:** This test reads the production database schema and verifies that Row Level Security is enabled on every private table. It also checks that the ownership policies use `auth.uid()`, the ID of the signed-in Supabase user. Together, these rules prevent User B from reading User A's contacts and make a direct request for another user's contact behave as “not found.”

**Red, then green:** For the controlled break, the `contacts` RLS-enablement statement was temporarily removed from the local schema file. The test failed because that table was no longer protected. The statement was immediately restored, and the same test passed. The broken schema was never applied to Supabase or committed.

![Data-isolation test failing after the controlled RLS break](evidence/screenshots/data-isolation-red.png)

![Data-isolation test passing after RLS was restored](evidence/screenshots/data-isolation-green.png)

**Deployed acceptance test:** Two temporary accounts were created against the deployed Supabase project. User A created a contact; User B's list remained empty, and User A's direct contact URL displayed “Contact not found” for User B. The temporary records and accounts were removed after the check.

**What would break it:** Disabling RLS or replacing an ownership policy with `using (true)` could expose another user's data.

## Dashboard summary

**Automated test:** The test supplies two interactions in October 2026 and one in September 2026, then confirms that “Interactions this month” equals 2.

**What would break it:** Removing the year/month comparison would count all three interactions and fail the test.

**PR evidence:** Temporarily remove the month filter, capture the failing test, restore it, rerun the test, and capture the passing result. Do not commit the intentional break.
