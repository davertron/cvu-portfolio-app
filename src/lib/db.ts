import { v4 as uuidv4 } from 'uuid';
import firebase from 'firebase/app';
import 'firebase/firestore';

// Schema definitions
// Note: most of the attributes here are optional because the objects passed to functions like doc.set({...}) must match schema types, but will not necessarily contain all fields

export interface User {
    email?: string
    name?: string
    bio_pic?: string
    bio?: string
}

export interface FileCollection {
    drive_id?: string
    title?: string
    author_id?: string
}

export interface Artifact {
    drive_id?: string
    description?: string
}

export interface Post {
    body?: string
    author_id?: string
    tags?: string[]
}

export interface Comment {
    body: string
}

const app = firebase.apps.length? firebase.apps[0] : firebase.initializeApp({
    apiKey: process.env.FIREBASE_APP_ID,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
});

class Converter<T> {
    toFirestore = (data: T) => data;
    fromFirestore = (snapshot: firebase.firestore.QueryDocumentSnapshot) => snapshot.data() as T;
}

class CollectionFactory {
    store: firebase.firestore.Firestore;

    constructor(store: firebase.firestore.Firestore){
        this.store = store;
    }

    new<Schema>(name: string){
        const converter = new Converter<Schema>();
        return this.store.collection(name).withConverter(converter);
    }
}

const store = app.firestore();
const cf = new CollectionFactory(store);

export default {
    users: cf.new<User>('users'),
    file_collections: cf.new<FileCollection>('file_collections'),
    posts: cf.new<Post>('posts'),
    post_comments: (postId: string) => cf.new<Comment>('posts/' + postId + '/comments'),
    file_collection_artifacts: (collectionId: string) => cf.new<Artifact>('file_collections/' + collectionId + '/artifacts')
};

// db-specific utils

export const id = () => uuidv4();
