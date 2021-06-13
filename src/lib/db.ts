import { v4 as uuidv4 } from 'uuid';

import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';

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
    title?: string
    description?: string
    icon?: string
    thumbnail?: string
    // Temporary field to indicate the artifact needs to be moved to a new folder
    awaiting_copy?: boolean
    // Temporary field to indicate the artifact needs to be deleted
    awaiting_delete?: boolean
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
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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
const bucket = app.storage().ref();
const cf = new CollectionFactory(store);

interface DriveHandler<T> {
    load?: (obj: T, ...args: string[]) => Promise<T>;
    save?: (obj: T, ...args: string[]) => Promise<T>;
}

// Handles drive-based schema attributes
class DriveDB {

    client;

    constructor(client){
        this.client = client;
    }

    artifacts: DriveHandler<Artifact> = {
        load: async (artifact: Artifact) : Promise<Artifact> => {
            const snapshot = await this.client.drive.files.get({
                fileId: artifact.drive_id,
                fields: 'name,iconLink,thumbnailLink,description'
            });
            const metadata = snapshot.result;

            if(metadata){
                return {
                    ...artifact,
                    title: metadata.name,
                    icon: metadata.iconLink,
                    thumbnail: metadata.thumbnailLink,
                    description: metadata.description || ''
                };
            }else{
                return artifact;
            }
        },

        save: async (artifact: Artifact, collection_drive_id: string) : Promise<Artifact> => {
            if(artifact.awaiting_copy){
                const snapshot = await this.client.drive.files.copy({
                    resource: {
                        name: artifact.title,
                        description: artifact.description,
                        parents: [collection_drive_id]
                    },
                    fileId: artifact.drive_id,
                    fields: 'id'
                });

                artifact.drive_id = snapshot.result.id;
                artifact.awaiting_copy = false;
            }else if(artifact.awaiting_delete){
                await this.client.drive.files.delete({fileId: artifact.drive_id});
            }else{
                await this.client.drive.files.update({
                    resource: {
                        name: artifact.title,
                        description: artifact.description
                    },
                    fileId: artifact.drive_id
                });
            }

            return artifact;
        }
    };

    file_collections: DriveHandler<[FileCollection, Artifact[]]> = {
        save: async ([collection, artifacts]: [FileCollection, Artifact[]]) : Promise<[FileCollection, Artifact[]]> => {
            if(!collection.drive_id){
                const folderSnapshot = await this.client.drive.files.create({
                    resource: {
                        name: collection.title,
                        mimeType: 'application/vnd.google-apps.folder'
                    },
                    fields: 'id'
                });

                collection.drive_id = folderSnapshot.result.id;
            }else{
                await this.client.drive.files.update({
                    resource: {
                        name: collection.title
                    },
                    fileId: collection.drive_id
                })
            }

            artifacts = await Promise.all(artifacts.map(
                async artifact => await this.artifacts.save(artifact, collection.drive_id)
            ));

            return [collection, artifacts];
        },

        load: async ([collection, artifacts]: [FileCollection, Artifact[]]) : Promise<[FileCollection, Artifact[]]> => {
            const folderSnapshot = await this.client.drive.files.get({
                fileId: collection.drive_id,
                fields: 'name'
            });

            collection.title = folderSnapshot.result.name;

            artifacts = await Promise.all(artifacts.map(
                async artifact => await this.artifacts.load(artifact)
            ));

            return [collection, artifacts];
        }
    };

}

export default {
    users: cf.new<User>('users'),
    file_collections: cf.new<FileCollection>('file_collections'),
    posts: cf.new<Post>('posts'),
    comments: (postId: string) => cf.new<Comment>('posts/' + postId + '/comments'),
    artifacts: (collectionId: string) => cf.new<Artifact>('file_collections/' + collectionId + '/artifacts'),

    // Virtual (not directly loaded from db) model fields
    drive: client => new DriveDB(client),

    // File storage bucket
    storage: (filename: string) => bucket.child(filename),
    avatars: (filename: string) => bucket.child('avatars/' + filename)
};

// db-specific utils

export const id = () => uuidv4();
