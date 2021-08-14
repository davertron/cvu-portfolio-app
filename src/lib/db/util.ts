// db-specific utils/types

import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/app';

export type Timestamp = firebase.firestore.Timestamp;
export type App = firebase.app.App;
export type Firestore = firebase.firestore.Firestore;
export type StorageReference = firebase.storage.Reference;
export type Auth = firebase.auth.Auth;

export const dbid = () => uuidv4();
export const now = () => firebase.firestore.Timestamp.now();
