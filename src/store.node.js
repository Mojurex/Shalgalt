// Proxy module to choose between Firebase-backed store or file-based store.
import dotenv from 'dotenv';
dotenv.config();

import * as fileStore from './store.js';

let fbStore = null;
const useFirebase = (process.env.USE_FIREBASE === 'true' || !!process.env.FIREBASE_SERVICE_ACCOUNT);
let backend = 'file';
let logged = false;

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
  const fb = await ensureFb();
  if (fb && fb.initStore) return fb.initStore();
  return fileStore.initStore();
}

// Users (Firebase if enabled, fallback to file store)
export async function upsertUser(payload){
  const fb = await ensureFb();
  if (fb && fb.upsertUser) return fb.upsertUser(payload);
  return fileStore.upsertUser(payload);
}

export async function listUsers(){
  const fb = await ensureFb();
  if (fb && fb.listUsers) return fb.listUsers();
  return fileStore.listUsers();
}

export async function updateUser(id, payload){
  const fb = await ensureFb();
  if (fb && fb.updateUser) return fb.updateUser(id, payload);
  return fileStore.updateUser(id, payload);
}

export async function deleteUser(id){
  const fb = await ensureFb();
  if (fb && fb.deleteUser) return fb.deleteUser(id);
  return fileStore.deleteUser(id);
}

// Introspection helper: which backend is active
export async function getBackend(){
  await ensureFb();
  return backend;
}

// Everything else - try Firebase first if available, fallback to file store
export async function getAllTests(){
  const fb = await ensureFb();
  if (fb && fb.getAllTests) return fb.getAllTests();
  return fileStore.getAllTests();
}

export async function startTest(userId, examType){
  const fb = await ensureFb();
  if (fb && fb.startTest) return fb.startTest(userId, examType);
  return fileStore.startTest(userId, examType);
}

export async function saveAnswers(testId, answers){
  const fb = await ensureFb();
  if (fb && fb.saveAnswers) return fb.saveAnswers(testId, answers);
  return fileStore.saveAnswers(testId, answers);
}

export async function computeScore(testId){
  const fb = await ensureFb();
  if (fb && fb.computeScore) return fb.computeScore(testId);
  return fileStore.computeScore(testId);
}

export async function saveEssay(testId, which, text){
  const fb = await ensureFb();
  if (fb && fb.saveEssay) return fb.saveEssay(testId, which, text);
  return fileStore.saveEssay(testId, which, text);
}

export async function finishTest(testId){
  const fb = await ensureFb();
  if (fb && fb.finishTest) return fb.finishTest(testId);
  return fileStore.finishTest(testId);
}

export async function getResult(testId){
  const fb = await ensureFb();
  if (fb && fb.getResult) return fb.getResult(testId);
  return fileStore.getResult(testId);
}

export async function getQuestionsForTest(testId){
  const fb = await ensureFb();
  if (fb && fb.getQuestionsForTest) return fb.getQuestionsForTest(testId);
  return fileStore.getQuestionsForTest(testId);
}

export async function getModuleScore(testId, section){
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
