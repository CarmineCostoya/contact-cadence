# Required Test Evidence

## Data isolation

**Automated guard:** The test verifies that RLS is enabled for every private table and that ownership policies use `auth.uid()`. Removing one of those RLS statements or ownership policies fails the test.

**Deployed acceptance test:** Create User A and User B. Add a contact as User A. User B's contact list must remain empty, and opening User A's contact hash URL must show “Contact not found.” Capture the failing screenshot from a temporary controlled policy break and a passing screenshot after restoration; never commit or leave the insecure policy active.

**What would break it:** Disabling RLS or replacing an ownership policy with `using (true)` could expose another user's data.

## Dashboard summary

**Automated test:** The test supplies two interactions in October 2026 and one in September 2026, then confirms that “Interactions this month” equals 2.

**What would break it:** Removing the year/month comparison would count all three interactions and fail the test.

**PR evidence:** Temporarily remove the month filter, capture the failing test, restore it, rerun the test, and capture the passing result. Do not commit the intentional break.
