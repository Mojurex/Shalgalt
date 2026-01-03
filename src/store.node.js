// Proxy module to choose between MongoDB, Firebase, or file-based store.
import dotenv from 'dotenv';
dotenv.config();

import * as fileStore from './store.js';

let mongoStore = null;
let fbStore = null;
const useMongo = (process.env.USE_MONGO === 'true' || !!process.env.MONGO_URI);
const useFirebase = (process.env.USE_FIREBASE === 'true' || !!process.env.FIREBASE_SERVICE_ACCOUNT);
let backend = 'file';
let logged = false;

async function ensureMongo(){
  if (!useMongo) return null;
  if (mongoStore) return mongoStore;
  try {
    mongoStore = await import('./store_mongo.js');
    backend = 'mongo';
    if (!logged) {
      console.info('MongoDB store active');
      logged = true;
    }
    return mongoStore;
  } catch (e) {
    console.warn('MongoDB store failed to load:', e.message);
    mongoStore = null;
    return null;
  }
}

async function ensureFb(){
  if (!useFirebase) {
    if (!logged) {
      console.warn('Firebase disabled: set USE_FIREBASE=true and FIREBASE_SERVICE_ACCOUNT to enable Firestore.');
      logged = true;
    }
    return null;
  }
  if (fbStore) return fbStore;
  try {
    // Dynamic ESM import for Netlify Functions compatibility
    fbStore = await import('./store_firebase.js');
    backend = 'firebase';
    if (!logged) {
      console.info('Firebase store active');
      logged = true;
    }
    return fbStore;
  } catch (e) {
    console.warn('Firebase store failed to load, falling back to file-based store:', e.message);
    backend = 'file';
    logged = true;
    return null;
  }
}

// Initialization
export async function initStore(){
  const mongo = await ensureMongo();
  if (mongo && mongo.initStore) return mongo.initStore();
  const fb = await ensureFb();
  if (fb && fb.initStore) return fb.initStore();
  return fileStore.initStore();
}

// Users (MongoDB → Firebase → file store fallback)
export async function upsertUser(payload){
  const mongo = await ensureMongo();
  if (mongo && mongo.upsertUser) return mongo.upsertUser(payload);
  const fb = await ensureFb();
  if (fb && fb.upsertUser) return fb.upsertUser(payload);
  return fileStore.upsertUser(payload);
}

export async function listUsers(){
  const mongo = await ensureMongo();
  if (mongo && mongo.listUsers) return mongo.listUsers();
  const fb = await ensureFb();
  if (fb && fb.listUsers) return fb.listUsers();
  return fileStore.listUsers();
}

export async function updateUser(id, payload){
  const mongo = await ensureMongo();
  if (mongo && mongo.updateUser) return mongo.updateUser(id, payload);
  const fb = await ensureFb();
  if (fb && fb.updateUser) return fb.updateUser(id, payload);
  return fileStore.updateUser(id, payload);
}

export async function deleteUser(id){
  const mongo = await ensureMongo();
  if (mongo && mongo.deleteUser) return mongo.deleteUser(id);
  const fb = await ensureFb();
  if (fb && fb.deleteUser) return fb.deleteUser(id);
  return fileStore.deleteUser(id);
}

// Introspection helper: which backend is active
export async function getBackend(){
  await ensureMongo();
  await ensureFb();
  return backend;
}

// Everything else - try MongoDB → Firebase → file store fallback
export async function getAllTests(){
  const mongo = await ensureMongo();
  if (mongo && mongo.getAllTests) return mongo.getAllTests();
  const fb = await ensureFb();
  if (fb && fb.getAllTests) return fb.getAllTests();
  return fileStore.getAllTests();
}

export async function startTest(userId, examType){
  const mongo = await ensureMongo();
  if (mongo && mongo.startTest) return mongo.startTest(userId, examType);
  const fb = await ensureFb();
  if (fb && fb.startTest) return fb.startTest(userId, examType);
  return fileStore.startTest(userId, examType);
}

export async function saveAnswers(testId, answers){
  const mongo = await ensureMongo();
  if (mongo && mongo.saveAnswers) return mongo.saveAnswers(testId, answers);
  const fb = await ensureFb();
  if (fb && fb.saveAnswers) return fb.saveAnswers(testId, answers);
  return fileStore.saveAnswers(testId, answers);
}

export async function computeScore(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.computeScore) return mongo.computeScore(testId);
  const fb = await ensureFb();
  if (fb && fb.computeScore) return fb.computeScore(testId);
  return fileStore.computeScore(testId);
}

export async function saveEssay(testId, which, text){
  const mongo = await ensureMongo();
  if (mongo && mongo.saveEssay) return mongo.saveEssay(testId, which, text);
  const fb = await ensureFb();
  if (fb && fb.saveEssay) return fb.saveEssay(testId, which, text);
  return fileStore.saveEssay(testId, which, text);
}

export async function finishTest(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.finishTest) return mongo.finishTest(testId);
  const fb = await ensureFb();
  if (fb && fb.finishTest) return fb.finishTest(testId);
  return fileStore.finishTest(testId);
}

export async function getResult(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.getResult) return mongo.getResult(testId);
  const fb = await ensureFb();
  if (fb && fb.getResult) return fb.getResult(testId);
  return fileStore.getResult(testId);
}

export async function getQuestionsForTest(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.getQuestionsForTest) return mongo.getQuestionsForTest(testId);
  const fb = await ensureFb();
  if (fb && fb.getQuestionsForTest) return fb.getQuestionsForTest(testId);
  return fileStore.getQuestionsForTest(testId);
}

export async function getModuleScore(testId, section){
  const mongo = await ensureMongo();
  if (mongo && mongo.getModuleScore) return mongo.getModuleScore(testId, section);
  const fb = await ensureFb();
  if (fb && fb.getModuleScore) return fb.getModuleScore(testId, section);
  return fileStore.getModuleScore(testId, section);
}

export const getQuestions = fileStore.getQuestions;
export const getQuestionsAdmin = fileStore.getQuestionsAdmin;
export const upsertQuestion = fileStore.upsertQuestion;
export const deleteQuestion = fileStore.deleteQuestion;
export const getSATQuestions = fileStore.getSATQuestions;
export const getSATQuestionsAdmin = fileStore.getSATQuestionsAdmin;
export const upsertSATQuestion = fileStore.upsertSATQuestion;
export const deleteSATQuestion = fileStore.deleteSATQuestion;
