# Netlify Functions Deployment Guide

## Overview

This project is configured to deploy on Netlify using serverless functions. Each API route is implemented as a separate Netlify Function.

## Architecture

### Functions Structure
```
netlify/functions/
├── users.js                 # User CRUD operations
├── queries.js              # Question management & statistics
├── tests.js                # Test lifecycle & scoring
├── sat-questions.js        # SAT Module 1 (Verbal)
├── sat-math-questions.js   # SAT Module 2 (Math)
└── sat-materials.js        # Materials & email
```

### API Routing
- Routes starting with `/api/*` are automatically routed to `/.netlify/functions/:splat`
- Each function handles its respective resource path
- Query parameters are accessible via `event.queryStringParameters`
- Request body is in `event.body` (parsed as JSON)

## Deployment Steps

### 1. Prerequisites
- GitHub account with repository access
- Netlify account (free tier available)
- Git CLI

### 2. Connect to Netlify

#### Option A: Connect via Netlify Dashboard
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Select GitHub repository (Shalgalt)
4. Configure build settings:
   - **Build command**: `npm install`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`

#### Option B: Connect via Netlify CLI
```bash
npm install -g netlify-cli
cd /Users/mac/Documents/Shalgalt
netlify init
```

### 3. Configure Environment Variables
In Netlify Dashboard → Site Settings → Build & Deploy → Environment:

Required variables:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. Deploy
Push to `main` branch to trigger auto-deployment:
```bash
git push origin main
```

Or manually deploy:
```bash
netlify deploy --prod
```

## Local Testing with Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start local dev server (simulates Netlify environment)
cd /Users/mac/Documents/Shalgalt
netlify dev

# Runs at http://localhost:8888
# API endpoints: http://localhost:8888/api/*
```

## API Endpoints

All endpoints mapped to Netlify Functions:

### Users
- `POST /api/users` - Create user
- `GET /api/users` - List all users
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Questions (Placement Exam)
- `GET /api/questions` - List questions (without answers)
- `GET /api/questions/admin` - List questions (with answers)
- `POST /api/questions` - Create/update question
- `DELETE /api/questions/:id` - Delete question

### Tests
- `POST /api/tests/start` - Start new test
- `GET /api/tests/:testId/questions` - Get test questions
- `POST /api/tests/:testId/answers` - Save answers
- `POST /api/tests/:testId/finish-answers` - Calculate score
- `GET /api/tests/:testId/module-score?section=verbal|math` - Module-specific score
- `POST /api/tests/:testId/essay1` - Save essay 1
- `POST /api/tests/:testId/essay2` - Save essay 2
- `POST /api/tests/:testId/finish` - Finish test
- `GET /api/tests/:testId/result` - Get test result

### SAT Questions (Module 1 - Verbal)
- `GET /api/sat-questions` - List questions
- `GET /api/sat-questions/admin` - List with answers
- `POST /api/sat-questions` - Create/update
- `DELETE /api/sat-questions/:id` - Delete

### SAT Math Questions (Module 2)
- `GET /api/sat-math-questions` - List questions
- `GET /api/sat-math-questions/admin` - List with answers
- `POST /api/sat-math-questions` - Create/update
- `DELETE /api/sat-math-questions/:id` - Delete

### SAT Materials
- `GET /api/sat/materials` - List materials
- `POST /api/sat/send` - Send materials via email

## Data Storage

Data is stored in JSON files:
- `data/db.json` - User, test, answer records
- `src/questions.json` - Placement exam questions
- `src/sat_questions.json` - SAT Module 1 (Verbal)
- `src/sat_math_questions.json` - SAT Module 2 (Math)

On Netlify, these files are persisted in the function environment but you'll need to implement a backup/sync strategy for long-term data storage (e.g., database integration).

## Frontend

Static files served from `public/` directory:
- `index.html` - User enrollment
- `test.html` - Test interface
- `essay1.html`, `essay2.html` - Essay inputs
- `result.html` - Score display
- `admin.html` - Admin dashboard

## Known Limitations

1. **File-based storage**: JSON files stored locally. For production with multiple instances, consider migrating to a database.
2. **No persistence between deployments**: Each Netlify deployment resets the file system.
3. **Serverless cold starts**: First request may have slight delay.

## Upgrading to Database

When you're ready to scale beyond file-based storage, consider:
- MongoDB Atlas (free tier available)
- Firebase Realtime Database
- Supabase PostgreSQL
- DynamoDB (AWS)

Update `src/store.js` to use your chosen database instead of JSON files.

## Troubleshooting

### Functions not deploying
- Ensure `netlify.toml` exists in root
- Check `netlify/functions/` contains handler files
- Verify file exports: `export const handler = async (event, context) => {...}`

### Environment variables not working
- Set in Netlify Dashboard (not in `.env` file for Netlify environment)
- Netlify ignores local `.env` during deployment

### Data loss on redeploy
- This is expected with file-based storage
- Implement database integration for persistent storage

### Test API locally
```bash
netlify dev
curl http://localhost:8888/api/users
```

## Support

For Netlify-specific issues:
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Community Forums](https://community.netlify.com/)

For application issues:
- Check function logs in Netlify Dashboard → Functions
- Use browser DevTools Network tab to inspect requests
