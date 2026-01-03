# MongoDB Setup Guide

## Overview
**Shalgalt now uses MongoDB Atlas as the primary backend** for all persistent data (users, tests, answers, scores). Firebase has been completely removed.

MongoDB provides:
- ✅ Cost-effective cloud storage
- ✅ Built-in scaling and redundancy
- ✅ Native Node.js driver support
- ✅ Flexible schema (no migrations needed)

---

## Your MongoDB Atlas Setup

### MongoDB Atlas Cluster Details
```
Cluster: cluster0
Region: (check your cluster)
Connection String: mongodb+srv://towshoo588_db_user:<password>@cluster0.yyiyklv.mongodb.net/?appName=Cluster0
```

---

## Local Development Setup

### 1. Environment Variables

Create or update your `.env` file in the project root:

```env
# MongoDB Configuration (Primary Backend)
USE_MONGO=true
MONGO_URI=mongodb+srv://towshoo588_db_user:<your-password>@cluster0.yyiyklv.mongodb.net/?appName=Cluster0
```

Replace `<your-password>` with your MongoDB Atlas password.

### 2. Run Local Server

```bash
# Install dependencies (if not already done)
npm install

# Start the local server
npm start
# or use node directly
node server.js
```

The app will:
- Check `USE_MONGO` and `MONGO_URI` environment variables
- Connect to MongoDB Atlas if configured
- Fall back to file-based store if MongoDB is unavailable
- Log "MongoDB store active" when successfully connected

---

## Production Deployment

### Netlify Configuration

1. Go to **Site Settings** → **Build & Deploy** → **Environment Variables**
2. Add these variables:
   - **Key**: `USE_MONGO` | **Value**: `true`
   - **Key**: `MONGO_URI` | **Value**: `mongodb+srv://towshoo588_db_user:<password>@cluster0.yyiyklv.mongodb.net/?appName=Cluster0`

3. Replace `<password>` with your actual MongoDB password
4. **Deploy** to apply changes (or push a commit to trigger redeploy)

### Vercel Configuration (if using Vercel API)

1. Go to **Project Settings** → **Environment Variables**
2. Add the same two variables as above
3. Redeploy the project

### Checking Backend Status

After deployment, verify MongoDB is active:

```bash
# Check which backend is active
curl https://your-domain.com/api/users?status=1

# Response should include:
# "backend": "mongo"
```

---

## Database Collections

MongoDB uses the following collections:

### `users` Collection
Stores user profiles and registration data.

```javascript
{
  _id: ObjectId,
  id: String,            // Unique user ID
  name: String,
  age: Number,
  email: String,
  emailLower: String,    // Lowercase for deduplication
  phone: String,
  created_at: Date
}
```

**Indexes:**
- `emailLower` (unique) - Prevents duplicate emails

### `tests` Collection
Stores test sessions and results.

```javascript
{
  _id: ObjectId,
  id: String,            // Unique test ID
  user_id: String,       // Reference to user
  exam_type: String,     // "placement", "sat-verbal", "sat-math"
  status: String,        // "active", "completed"
  score: Number,         // Final score
  score_raw: Number,     // Raw points
  total_questions: Number,
  level: String,         // Test level
  started_at: Date,
  finished_at: Date,
  essay1_text: String,   // Optional essay response
  essay1_words: Number,
  essay2_text: String,   // Optional essay response
  essay2_words: Number
}
```

### `answers` Collection
Stores individual question answers during a test.

```javascript
{
  _id: ObjectId,
  test_id: String,
  question_id: String,
  selected_index: Number, // For multiple choice
  text_answer: String     // For essay/text questions
}
```

### `counters` Collection
Atomic counter for generating sequential IDs.

```javascript
{
  _id: String,           // "userId" or "testId"
  counter: Number        // Current counter value
}
```

---

## Troubleshooting

### "MongoDB store failed to load"
**Problem:** Connection error or missing MONGO_URI
**Solution:** 
- Verify `MONGO_URI` is set correctly in `.env`
- Check MongoDB Atlas cluster is running and accessible
- Ensure IP whitelist allows your connection

### "Using file-based store"
**Problem:** MongoDB is not enabled
**Solution:**
- Set `USE_MONGO=true` in environment variables
- Add valid `MONGO_URI` environment variable

### Data not persisting
**Problem:** Using file-based fallback instead of MongoDB
**Solution:**
- Check logs for "MongoDB store active" message
- Verify `/api/users?status=1` returns `"backend": "mongo"`
- Ensure MongoDB Atlas password doesn't have special characters (or URL-encode them)

### Connection timeouts
**Problem:** Network or firewall issues
**Solution:**
- Check MongoDB Atlas IP whitelist (should include Netlify/Vercel IPs or 0.0.0.0/0)
- Test connection locally first
- Check MongoDB connection string format

---

## Migrating from Firebase (Completed)

**Status**: ✅ Firebase has been completely removed.

All user data should be migrated to MongoDB. If you need to migrate data from a previous Firebase project:

```bash
# Run migration script (if available)
node scripts/migrate-firestore.js
```

---

## Support

For MongoDB Atlas support, visit: https://docs.mongodb.com/
For driver documentation: https://www.npmjs.com/package/mongodb
