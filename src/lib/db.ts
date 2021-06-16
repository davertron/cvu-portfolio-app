import { v4 as uuidv4 } from 'uuid';
import { getSession } from 'next-auth/client';

import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/storage';

// Schema definitions
// Note: most of the attributes here are optional because the objects passed to functions like doc.set({...}) must match schema types, but will not necessarily contain all fields

export interface Model {
    id?: string
}

export interface User extends Model {
    email?: string
    name?: string
    bio_pic?: string
    bio?: string
}

export interface FileCollection extends Model {
    drive_id?: string
    title?: string
    author_id?: string
    web_view?: string
}

export interface Artifact extends Model {
    drive_id?: string
    title?: string
    description?: string
    icon?: string
    thumbnail?: string
    web_view?: string
    // Temporary field to indicate the artifact needs to be moved to a new folder
    awaiting_copy?: boolean
    // Temporary field to indicate the artifact needs to be deleted
    awaiting_delete?: boolean
}

export interface Post extends Model {
    title?: string
    body?: string
    created_at?: Date
    author_id?: string
    tags?: string[]
    // Temporary field to indicate the post hasn't been saved
    awaiting_save?: boolean
}

export interface Comment extends Model {
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

class Converter<T extends Model> {
    toFirestore = (data: T) => data;
    fromFirestore = (snapshot: firebase.firestore.QueryDocumentSnapshot) => {
        return {...snapshot.data(), id: snapshot.id} as T
    }
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
    remove?: (obj: T, ...args: string[]) => Promise<void>;
}

// Handles drive-based schema attributes
class DriveDB {

    client;

    constructor(client, token){
        client.setToken({access_token: token});
        this.client = client;
    }

    static async init(client) : Promise<DriveDB> {
        const session = await getSession();

        if(!session.error){
            return new DriveDB(client, session.accessToken);
        }else{
            throw new Error('OAuth session is no longer valid');
        }
    }

    artifacts: DriveHandler<Artifact> = {

        load: async (artifact: Artifact) : Promise<Artifact> => {
            const snapshot = await this.client.drive.files.get({
                fileId: artifact.drive_id,
                fields: 'name,iconLink,thumbnailLink,webViewLink,description'
            });
            const metadata = snapshot.result;

            console.log(metadata.webViewLink);
            //this.client.request(metadata.webViewLink).then(data => console.log(data)).catch(e => console.log(e));

            if(metadata){
                return {
                    ...artifact,
                    title: metadata.name,
                    icon: metadata.iconLink,
                    thumbnail: metadata.thumbnailLink,
                    web_view: metadata.webViewLink,
                    description: metadata.description || ''
                };
            }else{
                return artifact;
            }
        },

        save: async (artifact: Artifact, collection_drive_id?: string) : Promise<Artifact> => {
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
                        description: artifact.description
                    },
                    fileId: artifact.drive_id
                });
            }

            return artifact;
        },

        remove: async (artifact: Artifact) : Promise<void> => {
            artifact.awaiting_delete = true;
            await this.artifacts.save(artifact);
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
            const snapshot = await this.client.drive.files.get({
                fileId: collection.drive_id,
                fields: 'name,webViewLink'
            });
            const metadata = snapshot.result;

            collection.title = metadata.name;
            collection.web_view = metadata.webViewLink;

            artifacts = await Promise.all(artifacts.map(
                async artifact => await this.artifacts.load(artifact)
            ));

            return [collection, artifacts];
        },

        remove: async ([collection, artifacts]: [FileCollection, Artifact[]]) : Promise<void> => {
            await this.client.drive.files.delete({
                fileId: collection.drive_id
            });

            await Promise.all(artifacts.map(
                async artifact => await this.artifacts.remove(artifact)
            ));
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
    drive: async client => await DriveDB.init(client),

    // File storage bucket
    storage: (filename: string) => bucket.child(filename),
    avatars: (filename: string) => bucket.child('avatars/' + filename)
};

// db-specific utils

export const id = () => uuidv4();
