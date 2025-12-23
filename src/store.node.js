// Proxy module to choose between Firebase-backed store or file-based store.
import dotenv from 'dotenv';
dotenv.config();

import * as fileStore from './store.js';

let fbStore = null;
const useFirebase = (process.env.USE_FIREBASE === 'true' || !!process.env.FIREBASE_SERVICE_ACCOUNT);
let backend = 'file';

async function ensureFb(){
  if (!useFirebase) return null;
  if (fbStore) return fbStore;
  try {
    // Dynamic ESM import for Netlify Functions compatibility
    fbStore = await import('./store_firebase.js');
    backend = 'firebase';
    return fbStore;
  } catch (e) {
    console.warn('Firebase store failed to load, falling back to file-based store:', e.message);
    backend = 'file';
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

// Everything else from file store
export const getAllTests = fileStore.getAllTests;
export const getQuestions = fileStore.getQuestions;
export const getQuestionsAdmin = fileStore.getQuestionsAdmin;
export const upsertQuestion = fileStore.upsertQuestion;
export const deleteQuestion = fileStore.deleteQuestion;
export const startTest = fileStore.startTest;
export const saveAnswers = fileStore.saveAnswers;
export const computeScore = fileStore.computeScore;
export const saveEssay = fileStore.saveEssay;
export const finishTest = fileStore.finishTest;
export const getResult = fileStore.getResult;
export const getQuestionsForTest = fileStore.getQuestionsForTest;
export const getModuleScore = fileStore.getModuleScore;
export const getSATQuestions = fileStore.getSATQuestions;
export const getSATQuestionsAdmin = fileStore.getSATQuestionsAdmin;
export const upsertSATQuestion = fileStore.upsertSATQuestion;
export const deleteSATQuestion = fileStore.deleteSATQuestion;
