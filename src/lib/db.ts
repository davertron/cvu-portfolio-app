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

export enum UserRole {
    ADVISOR = 'ADVISOR',
    STUDENT = 'STUDENT',
    ADMIN = 'ADMIN'
}

export interface Permission {
    email: string
    drive_permissions: Map<string, string>
    awaiting_delete?: boolean
}

export interface User extends Model {
    email?: string
    name?: string
    bio_pic?: string
    bio?: string
    role?: UserRole
    shared_with?: Permission[]
    shared_with_email?: string[]
}

export interface FileCollection extends Model {
    drive_id?: string
    title?: string
    author_id?: string
    web_view?: string
}

export interface Artifact extends Model {
    drive_id?: string
    shortcut_id?: string
    title?: string
    description?: string
    icon?: string
    thumbnail?: string
    web_view?: string
    // Temporary field to indicate the artifact needs to be deleted
    awaiting_delete?: boolean
}

export interface Post extends Model {
    title?: string
    body?: string
    created_at?: firebase.firestore.Timestamp
    author_id?: string
    tags?: string[]
    // Temporary field to indicate the post hasn't been saved
    awaiting_save?: boolean
}

export interface Comment extends Model {
    body?: string
    author_id?: string
    awaiting_save?: boolean
}

const app = firebase.apps.length? firebase.apps[0] : firebase.initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
});

type ConverterPlugin<T extends Model> = (obj: T) => T;
type ConverterPlugins<T extends Model> = {toFirestorePlugin: ConverterPlugin<T>, fromFirestorePlugin?: ConverterPlugin<T>};

class Converter<T extends Model> {

    toFirestorePlugin: ConverterPlugin<T>
    fromFirestorePlugin: ConverterPlugin<T>

    constructor(plugins?: ConverterPlugins<T>){
        if(plugins) Object.assign(this, plugins);
    }

    toFirestore = (data: T) => {
        return this.toFirestorePlugin ? this.toFirestorePlugin(data) : data
    }

    fromFirestore = (snapshot: firebase.firestore.QueryDocumentSnapshot) => {
        const data = {...snapshot.data(), id: snapshot.id} as T;
        return this.fromFirestorePlugin ? this.fromFirestorePlugin(data) : data;
    }
}

class CollectionFactory {
    store: firebase.firestore.Firestore;

    constructor(store: firebase.firestore.Firestore){
        this.store = store;
    }

    new<Schema extends Model>(name: string, plugins?: ConverterPlugins<Schema>){
        const converter = new Converter<Schema>(plugins);
        return this.store.collection(name).withConverter(converter);
    }
}

const store = app.firestore();
const bucket = app.storage().ref();
const cf = new CollectionFactory(store);

type CollectionReference = firebase.firestore.CollectionReference;
type CollectionChild = (parentId: string) => CollectionReference;
type DriveReference = (client: any) => Promise<DriveDB>;
type BucketReference = (filename: string) => firebase.storage.Reference;

interface Db {
    users: CollectionReference,
    file_collections: CollectionReference,
    posts: CollectionReference,
    comments: CollectionChild
    artifacts: CollectionChild,

    storage: BucketReference,
    avatars: BucketReference,

    drive: DriveReference
}

let db: Db = {
    // Firestore collections
    users: cf.new<User>('users', {
        // Auto-generate index array for easier queries
        toFirestorePlugin: user => ({
            ...user,
            shared_with_email: user.shared_with ?
                user.shared_with.map(p => p.email)
                :
                []
        })
    }),
    file_collections: cf.new<FileCollection>('file_collections'),
    posts: cf.new<Post>('posts'),
    comments: (postId: string) => cf.new<Comment>('posts/' + postId + '/comments'),
    artifacts: (collectionId: string) => cf.new<Artifact>('file_collections/' + collectionId + '/artifacts'),

    // File storage bucket
    storage: (filename: string) => bucket.child(filename),
    avatars: (filename: string) => bucket.child('avatars/' + filename),

    drive: null
};

interface DriveHandler<T> {
    load?: (obj: T, ...args: string[]) => Promise<T>;
    save?: (obj: T, ...args: string[]) => Promise<T>;
    remove?: (obj: T, ...args: string[]) => Promise<void>;
    share?: (obj: T, permission: Permission, ...args: string[]) => Promise<Permission>;
    unshare?: (obj: T, permission: Permission, ...args: string[]) => Promise<Permission>;
    set_access?: (obj: T, permission: Permission, ...args: string[]) => Promise<Permission> | Promise<null>;
}

// Handles drive-based schema attributes
class DriveDB {

    client;

    constructor(client, token: string){
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

    private async newPermissionId(fileId: string, emailAddress: string) : Promise<string> {
        const snapshot = await this.client.drive.permissions.create({
            type: 'user',
            role: 'reader',
            fields: 'id',
            emailAddress,
            fileId
        });

        return snapshot.result.id;
    }

    private async deletePermission(fileId: string, permissionId: string){
        await this.client.drive.permissions.delete({fileId, permissionId});
    }

    artifacts: DriveHandler<Artifact> = {

        load: async (artifact: Artifact) => {
            const snapshot = await this.client.drive.files.get({
                fileId: artifact.drive_id,
                fields: 'name,iconLink,thumbnailLink,webViewLink,description'
            });
            const metadata = snapshot.result;

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

        save: async (artifact: Artifact, collection_drive_id?: string) => {
            if(artifact.awaiting_delete){
                await this.client.drive.files.delete({fileId: artifact.shortcut_id});
            }else{
                await this.client.drive.files.update({
                    resource: {
                        description: artifact.description,
                    },
                    fileId: artifact.drive_id
                });

                if(!artifact.shortcut_id){
                    const snapshot = await this.client.drive.files.create({
                        resource: {
                            mimeType: 'application/vnd.google-apps.shortcut',
                            parents: [collection_drive_id],
                            shortcutDetails: {
                                targetId: artifact.drive_id
                            }
                        },
                        fields: 'id'
                    });

                    artifact.shortcut_id = snapshot.result.id;
                }
            }

            return artifact;
        },

        remove: async (artifact: Artifact) => {
            artifact.awaiting_delete = true;
            await this.artifacts.save(artifact);
        },

    };

    file_collections: DriveHandler<[FileCollection, Artifact[]]> = {

        save: async ([collection, artifacts]: [FileCollection, Artifact[]]) => {
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

        load: async ([collection, artifacts]: [FileCollection, Artifact[]]) => {
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

        remove: async ([collection, artifacts]: [FileCollection, Artifact[]]) => {
            await this.client.drive.files.delete({
                fileId: collection.drive_id
            });

            await Promise.all(artifacts.map(
                async artifact => await this.artifacts.remove(artifact)
            ));
        },

        share: async ([collection, artifacts]: [FileCollection, Artifact[]], permission: Permission) => {
            const updated =  permission;

            if(!updated.drive_permissions[collection.drive_id]){
                updated.drive_permissions[collection.drive_id] = await this.newPermissionId(
                    collection.drive_id,
                    updated.email
                );
            }

            for(let artifact of artifacts){
                if(!updated.drive_permissions[artifact.drive_id]){
                    updated.drive_permissions[artifact.drive_id] = await this.newPermissionId(
                        artifact.drive_id,
                        updated.email
                    );
                }
            }

            return updated;
        },

        unshare: async ([collection, artifacts]: [FileCollection, Artifact[]], permission: Permission) => {
            if(permission.drive_permissions[collection.drive_id]){
                await this.deletePermission(collection.drive_id, permission.drive_permissions[collection.drive_id]);
                delete permission.drive_permissions[collection.drive_id];
            }

            for(let artifact of artifacts){
                if(permission.drive_permissions[artifact.drive_id]){
                    await this.deletePermission(artifact.drive_id, permission.drive_permissions[artifact.drive_id]);
                    delete permission.drive_permissions[artifact.drive_id];
                }
            }

            return permission;
        },

        set_access: async (state: [FileCollection, Artifact[]], permission: Permission) => {
            return await this.file_collections[permission.awaiting_delete ? 'unshare' : 'share'](state, permission);
        }
    };

}

// Virtual (not directly loaded from db) model fields
db.drive = async client => await DriveDB.init(client);

// db-specific utils
export type Timestamp = firebase.firestore.Timestamp;
export const id = () => uuidv4();
export const now = () => firebase.firestore.Timestamp.now();

export default db;
