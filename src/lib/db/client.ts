import firebase from 'firebase/app';
import Db from './base';
import DriveDb from './drive';
import { App, Firestore, Auth, StorageReference } from './util';

export type DriveReference = (client: any) => Promise<DriveDb>;
export type BucketReference = (filename: string) => firebase.storage.Reference;

// Db using client-side firebase library
class ClientDb extends Db {

    app: firebase.app.App;

    storage: BucketReference;
    avatars: BucketReference;
    drive: DriveReference;

    store: Firestore;
    bucket: StorageReference;
    auth: Auth;

    constructor(app: App){
        super(app, process.env.NEXT_PUBLIC_NODE_ENV === 'development');

        this.app = app;
        this.auth = app.auth();
        this.store = app.firestore();
        this.bucket = this.app.storage().ref();
        this.drive = DriveDb.exec_safe(DriveDb.init);

        this.storage = (filename: string) => this.bucket.child(filename);
        this.avatars = (filename: string) => this.bucket.child('avatars/' + filename);
    }

}

const app = firebase.apps.length? firebase.apps[0] : firebase.initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
});

const db = new ClientDb(app);
export default db;
