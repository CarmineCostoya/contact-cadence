# GitHub Pages CI compatibility fix

The first GitHub Pages run failed because the current Supabase client requires a native WebSocket implementation when imported during tests, while the workflow used Node.js 20. Update the Pages workflow and documented engine requirement to Node.js 22, rerun the local tests and build, and ship the correction through a separate fix branch and pull request.
