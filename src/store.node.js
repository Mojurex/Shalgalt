// Proxy module to choose between Firebase-backed store or file-based store.
import dotenv from 'dotenv';
dotenv.config();

import * as fileStore from './store.js';

let fbStore = null;
const useFirebase = (process.env.USE_FIREBASE === 'true' || !!process.env.FIREBASE_SERVICE_ACCOUNT);

function ensureFb(){
  if (!useFirebase) return null;
  if (fbStore) return fbStore;
  // eslint-disable-next-line global-require
  fbStore = require('./store_firebase.js');
  return fbStore;
}

// Initialization
export function initStore(){
  const fb = ensureFb();
  if (fb && fb.initStore) return fb.initStore();
  return fileStore.initStore();
}

// Users (Firebase if enabled)
export function upsertUser(payload){
  const fb = ensureFb();
  if (fb && fb.upsertUser) return fb.upsertUser(payload);
  return fileStore.upsertUser(payload);
}

export function listUsers(){
  const fb = ensureFb();
  if (fb && fb.listUsers) return fb.listUsers();
  return fileStore.listUsers();
}

export function updateUser(id, payload){
  const fb = ensureFb();
  if (fb && fb.updateUser) return fb.updateUser(id, payload);
  return fileStore.updateUser(id, payload);
}

export function deleteUser(id){
  const fb = ensureFb();
  if (fb && fb.deleteUser) return fb.deleteUser(id);
  return fileStore.deleteUser(id);
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
