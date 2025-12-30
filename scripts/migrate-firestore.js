// ESM script to migrate Firestore data from OLD to NEW Firebase projects
// Usage:
// 1) Set env vars:
//    - FIREBASE_OLD_SERVICE_ACCOUNT (one-line JSON)
//    - FIREBASE_NEW_SERVICE_ACCOUNT (one-line JSON)
// 2) Run: npm run migrate:firestore
// Safe: Upserts by logical IDs, avoids duplicates, updates counters.

import { readFileSync } from 'node:fs';

async function initAdminFromEnv(envVarName, label){
  try{
    const mod = await import('firebase-admin');
    const admin = mod.default || mod;
    let jsonStr = process.env[envVarName] || '';
    if(!jsonStr && process.env[envVarName + '_FILE']){
      jsonStr = readFileSync(process.env[envVarName + '_FILE'], 'utf8');
    }
    if(!jsonStr) throw new Error(`${envVarName} not set`);
    const svc = JSON.parse(jsonStr);
    const app = admin.initializeApp({ credential: admin.credential.cert(svc), projectId: svc.project_id }, label);
    const db = admin.firestore(app);
    try{ db.settings({ ignoreUndefinedProperties: true }); }catch{}
    return { admin, db };
  }catch(e){
    console.error(`[${label}] init error:`, e.message);
    throw e;
  }
}

async function migrate(){
  const { db: oldDb } = await initAdminFromEnv('FIREBASE_OLD_SERVICE_ACCOUNT', 'old');
  const { db: newDb } = await initAdminFromEnv('FIREBASE_NEW_SERVICE_ACCOUNT', 'new');

  // Users
  console.log('Migrating users...');
  const usersSnap = await oldDb.collection('users').get();
  let userMax = 0; let usersMigrated = 0;
  for(const doc of usersSnap.docs){
    const u = doc.data();
    userMax = Math.max(userMax, Number(u.id||0));
    const exist = await newDb.collection('users').where('id','==',Number(u.id)).limit(1).get();
    if(exist.empty){
      await newDb.collection('users').add(u);
      usersMigrated++;
    } else {
      await exist.docs[0].ref.set(u, { merge: true });
    }
  }
  console.log(`Users migrated: ${usersMigrated}/${usersSnap.size}`);

  // Tests
  console.log('Migrating tests...');
  const testsSnap = await oldDb.collection('tests').get();
  let testMax = 0; let testsMigrated = 0;
  for(const doc of testsSnap.docs){
    const t = doc.data();
    testMax = Math.max(testMax, Number(t.id||0));
    const exist = await newDb.collection('tests').where('id','==',Number(t.id)).limit(1).get();
    if(exist.empty){
      await newDb.collection('tests').add(t);
      testsMigrated++;
    } else {
      await exist.docs[0].ref.set(t, { merge: true });
    }
  }
  console.log(`Tests migrated: ${testsMigrated}/${testsSnap.size}`);

  // Answers
  console.log('Migrating answers...');
  const answersSnap = await oldDb.collection('answers').get();
  let answersMigrated = 0; let answersSkipped = 0;
  for(const doc of answersSnap.docs){
    const a = doc.data();
    const exist = await newDb.collection('answers')
      .where('test_id','==',Number(a.test_id))
      .where('question_id','==',Number(a.question_id))
      .limit(1).get();
    if(exist.empty){
      await newDb.collection('answers').add(a);
      answersMigrated++;
    } else {
      // Update if fields differ
      await exist.docs[0].ref.set(a, { merge: true });
      answersSkipped++;
    }
  }
  console.log(`Answers migrated: ${answersMigrated}, updated existing: ${answersSkipped}`);

  // Counters
  console.log('Updating counters...');
  const countersRef = newDb.collection('counters').doc('global');
  await countersRef.set({ userId: userMax, testId: testMax }, { merge: true });
  console.log('Counters set to', { userId: userMax, testId: testMax });

  console.log('Migration complete.');
}

migrate().catch(err=>{ console.error('Migration failed:', err); process.exit(1); });
