# Required Test Evidence

## Data isolation

**Plain-English explanation:** This test creates two accounts, adds a contact while signed in as User A, and then asks for the list and direct detail URL as User B. User B receives an empty list and `404` for the direct URL.

**What would break it:** Removing the `user_id` condition from the contact list or detail query would expose User A’s contact and fail the test.

**Red/green evidence required for the PR:** Temporarily remove the ownership condition from a test branch, run `npm test`, and capture the failing output. Restore the condition, rerun the test, and capture the passing output. Do not commit the intentional break.

## Dashboard summary

**Plain-English explanation:** This test creates a contact, records two interactions in the current month and one in the previous month, then confirms that “Interactions this month” is exactly 2.

**What would break it:** Removing the current-month date boundary from the dashboard query would count all three interactions and fail the test.

**Red/green evidence required for the PR:** Temporarily remove the month-start condition, capture the failing test, restore the condition, and capture the passing test. Do not commit the intentional break.

## Current automated result

Both test files pass locally. Screenshots must be added to the applicable GitHub PR descriptions because screenshots cannot be generated retroactively from Git history.
