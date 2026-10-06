# E2E regression (T04)

```bash
npm install   # installs playwright-core
# Chrome/Chromium required on the host (channel: chrome|chromium)
node tests/e2e/run.js
```

Checks at **375 / 390 / 414 / 1280**:
- no horizontal overflow (`scrollWidth - innerWidth ≤ 2`)
- mobile sticky bar: Call + Get a Quote, **no sms:**
- soft console/page errors (ignores Trustindex/CORS/video)
- quote.html happy-path with mocked `POST /api/lead`

Also see legacy explorers copied from the audit box: `mobile.js`, `quoteflow.js`, `anq.js`, `cons.js`, `qa.js`.
