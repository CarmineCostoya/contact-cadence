# Data-isolation test evidence prompt

Document the required red/green evidence for the data-isolation test. Temporarily remove the contacts Row Level Security enablement statement only in the local working copy, run the focused test and capture its failure, restore the statement immediately, rerun the test, and capture the passing result. Never apply the broken schema to Supabase or commit it. Add a plain-English explanation and a sentence describing a real change that would break the test.
