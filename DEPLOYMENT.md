# Two45 deployment baseline

## Live state

- Pages project: `two45`
- Production URL: `https://two45.pages.dev`
- Known-good immutable deployment: `https://5412063a.two45.pages.dev`
- Backend Worker: `two45-live-worker`
- Backend cron: `*/5 * * * *`
- Tomorrow preload: 8 PM America/New_York

## Frontend fix pending promotion

The current live page renders a floating `#two45AskFab` and also row-level `button.analyze` controls. The intended UX is to keep the single bottom-right Ask Two45 entry point and remove/hide the row-level duplicates.

`pages-wrapper.js` contains the safe HTML-only patch for that change while leaving all API responses untouched.
