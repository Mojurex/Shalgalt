// Proxy module to choose between MongoDB or file-based store.
// Firebase has been removed in favor of MongoDB for cost and flexibility.
import dotenv from 'dotenv';
dotenv.config();

import * as fileStore from './store.js';

let mongoStore = null;
const useMongo = (process.env.USE_MONGO === 'true' || !!process.env.MONGO_URI);
let backend = 'file';
let logged = false;

async function ensureMongo(){
  if (!useMongo) {
    if (!logged && backend === 'file') {
      console.info('MongoDB disabled: set USE_MONGO=true and MONGO_URI to use MongoDB. Using file-based store.');
      logged = true;
    }
    return null;
  }
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
    console.warn('MongoDB store failed to load, falling back to file-based store:', e.message);
    backend = 'file';
    logged = true;
    return null;
  }
}

// Initialization
export async function initStore(){
  const mongo = await ensureMongo();
  if (mongo && mongo.initStore) return mongo.initStore();
  return fileStore.initStore();
}

// Users (MongoDB → file store fallback)
export async function upsertUser(payload){
  const mongo = await ensureMongo();
  if (mongo && mongo.upsertUser) return mongo.upsertUser(payload);
  return fileStore.upsertUser(payload);
}

export async function listUsers(){
  const mongo = await ensureMongo();
  if (mongo && mongo.listUsers) return mongo.listUsers();
  return fileStore.listUsers();
}

export async function updateUser(id, payload){
  const mongo = await ensureMongo();
  if (mongo && mongo.updateUser) return mongo.updateUser(id, payload);
  return fileStore.updateUser(id, payload);
}

export async function deleteUser(id){
  const mongo = await ensureMongo();
  if (mongo && mongo.deleteUser) return mongo.deleteUser(id);
  return fileStore.deleteUser(id);
}

// Introspection helper: which backend is active
export async function getBackend(){
  await ensureMongo();
  return backend;
}

// Everything else - try MongoDB → file store fallback
export async function getAllTests(){
  const mongo = await ensureMongo();
  if (mongo && mongo.getAllTests) return mongo.getAllTests();
  return fileStore.getAllTests();
}

export async function startTest(userId, examType){
  const mongo = await ensureMongo();
  if (mongo && mongo.startTest) return mongo.startTest(userId, examType);
  return fileStore.startTest(userId, examType);
}

export async function saveAnswers(testId, answers){
  const mongo = await ensureMongo();
  if (mongo && mongo.saveAnswers) return mongo.saveAnswers(testId, answers);
  return fileStore.saveAnswers(testId, answers);
}

export async function computeScore(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.computeScore) return mongo.computeScore(testId);
  return fileStore.computeScore(testId);
}

export async function saveEssay(testId, which, text){
  const mongo = await ensureMongo();
  if (mongo && mongo.saveEssay) return mongo.saveEssay(testId, which, text);
  return fileStore.saveEssay(testId, which, text);
}

export async function finishTest(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.finishTest) return mongo.finishTest(testId);
  return fileStore.finishTest(testId);
}

export async function getResult(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.getResult) return mongo.getResult(testId);
  return fileStore.getResult(testId);
}

export async function getQuestionsForTest(testId){
  const mongo = await ensureMongo();
  if (mongo && mongo.getQuestionsForTest) return mongo.getQuestionsForTest(testId);
  return fileStore.getQuestionsForTest(testId);
}

export async function getModuleScore(testId, section){
  const mongo = await ensureMongo();
  if (mongo && mongo.getModuleScore) return mongo.getModuleScore(testId, section);
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
