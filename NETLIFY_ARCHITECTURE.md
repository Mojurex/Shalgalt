# Shalgalt - Netlify Functions Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│  (Public HTML/CSS/JS - Served from /public folder)     │
│                                                         │
│  index.html ──┐                                        │
│  test.html   ├─► HTTP Requests to /api/*              │
│  essay*.html │                                        │
│  result.html ┘                                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ /api/* requests
                         │
         ┌───────────────▼────────────────┐
         │   NETLIFY.TOML REDIRECTS      │
         │  /api/* → /.netlify/functions  │
         └───────────────┬────────────────┘
                         │
         ┌───────────────▼────────────────────────────────┐
         │      NETLIFY SERVERLESS FUNCTIONS             │
         ├────────────────────────────────────────────────┤
         │  /api/users                    ────► users.js  │
         │  /api/questions, /api/stats    ────► queries.js│
         │  /api/tests/*                  ────► tests.js  │
         │  /api/sat-questions            ────► sat-*.js  │
         │  /api/sat-math-questions       ────► sat-*.js  │
         │  /api/sat/materials|send       ────► sat-*.js  │
         └────────────┬──────────────────────────────────┘
                      │
         ┌────────────▼──────────────┐
         │   STORE LAYER            │
         │  (src/store.js)          │
         │  - User CRUD             │
         │  - Test management       │
         │  - Answer tracking       │
         │  - Scoring logic         │
         │  - Module scoring        │
         └────────────┬──────────────┘
                      │
         ┌────────────▼──────────────────────────┐
         │   DATA FILES (JSON)                  │
         ├──────────────────────────────────────┤
         │  data/db.json                        │
         │  ├─ users[]                          │
         │  ├─ tests[]                          │
         │  ├─ answers[]                        │
         │  └─ counters                         │
         │                                      │
         │  src/questions.json (30 placement Q) │
         │  src/sat_questions.json (27 verbal)  │
         │  src/sat_math_questions.json (27)    │
         └──────────────────────────────────────┘
```

## Request Flow Example: Taking a Test

```
1. User fills enrollment form
   POST /api/users → users.js handler
   ↓
   Creates user, returns { id, name, age, ... }

2. User clicks "Start Test"
   POST /api/tests/start { userId, examType: 'sat' }
   ↓
   tests.js calls store.startTest()
   ↓
   Returns { id, user_id, exam_type, started_at, ... }

3. Fetch test questions
   GET /api/tests/:testId/questions
   ↓
   tests.js calls store.getQuestionsForTest()
   ↓
   Returns questions WITHOUT correct_index (security)

4. User answers questions
   POST /api/tests/:testId/answers { answers: [...] }
   ↓
   tests.js calls store.saveAnswers()
   ↓
   Stores in db.json answers[]

5. Module 1 break (SAT only)
   GET /api/tests/:testId/module-score?section=verbal
   ↓
   tests.js calls store.getModuleScore()
   ↓
   Returns { correct: 15, total: 27 } without exposing answers

6. User finishes test
   POST /api/tests/:testId/finish-answers
   ↓
   tests.js calls store.computeScore()
   ↓
   Calculates raw score, normalizes to 200-800, stores in db.json

7. Get results
   GET /api/tests/:testId/result
   ↓
   Returns { score, level, exam_type, ... }
```

## Deployment Path

```
Development
    │
    ├─ Code in /Users/mac/Documents/Shalgalt/
    ├─ Git push to github.com/Mojurex/Shalgalt
    │
    ▼
GitHub Main Branch
    │
    ├─ netlify.toml (config)
    ├─ netlify/functions/* (handlers)
    ├─ public/ (frontend)
    ├─ src/store.js + JSON files (data)
    └─ package.json (dependencies)
    │
    ▼
Netlify Dashboard
    │
    ├─ Auto-detect netlify.toml
    ├─ Install dependencies (npm install)
    ├─ Deploy functions to /functions/
    ├─ Deploy public/ to CDN
    └─ Set environment variables
    │
    ▼
Production URL
    └─ https://your-site-name.netlify.app
       ├─ Frontend: https://your-site-name.netlify.app/
       ├─ API: https://your-site-name.netlify.app/api/*
       └─ Admin: https://your-site-name.netlify.app/admin.html
```

## Environment Variables (Netlify Dashboard)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

These are NOT checked into git (.gitignore excludes .env)
Netlify reads them during function execution automatically.

## Security Model

```
Public Endpoints                    Secure Endpoints
├─ GET /api/questions       ✓       ├─ GET /api/questions/admin    (no auth yet)
├─ POST /api/users          ✓       ├─ POST /api/questions
├─ GET /api/sat-questions   ✓       ├─ DELETE /api/questions/:id
├─ GET /api/tests/:id/result ✓      └─ Email notifications (SMTP)
└─ POST /api/tests/:id/*    ✓
                                    Note: Consider adding auth middleware
Answers NOT exposed in responses    for production admin endpoints
```

## Known Limitations

1. **File-based Storage**: Data stored in JSON files
   - Works for testing/small scale
   - Reset on redeploy (no persistence)
   - Fix: Integrate MongoDB, Firebase, or PostgreSQL

2. **Netlify Cold Starts**: First request ~1-2 sec slower
   - Fix: Use paid plans with warmup

3. **Concurrent Users**: Single db.json = potential write conflicts
   - Fix: Implement proper locking or use database

## Next Steps

1. **Deploy**: Connect GitHub repo to Netlify Dashboard
2. **Test**: Use `netlify dev` for local testing
3. **Monitor**: Check function logs in Netlify Dashboard
4. **Scale**: Migrate JSON storage to database when needed
5. **Security**: Add authentication middleware for admin endpoints

---

**Architecture Created**: 2025-12-23  
**Status**: Ready for deployment ✅
