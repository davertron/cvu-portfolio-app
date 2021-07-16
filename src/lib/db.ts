import 'reflect-metadata';
import { v4 as uuidv4 } from 'uuid';
import { getSession, signOut } from 'next-auth/client';

import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/storage';

// Annotation to prevent field from being saved to Firestore
function NonSerializable(target, propertyKey){
    Reflect.defineMetadata('isNonSerializable', true, target, propertyKey);
}

function isNonSerializable<T>(instance: T, propertyKey: string){
    return !!Reflect.getMetadata('isNonSerializable', instance, propertyKey);
}

// Annotation to prevent field from being returned by Firestore
function Hidden(target, propertyKey){
    Reflect.defineMetadata('Hidden', true, target, propertyKey);
}

function isHidden<T>(instance: T, propertyKey: string){
    return !!Reflect.getMetadata('Hidden', instance, propertyKey);
}

// db-specific utils/types
export type Timestamp = firebase.firestore.Timestamp;
export const dbid = () => uuidv4();
export const now = () => firebase.firestore.Timestamp.now();

// Schema definitions

type AnyObject = {[key: string]: any};

export class Model {
    @NonSerializable
    id?: string = dbid();

    // Creates a new model instance to force re-render in setState methods
    protected newInstance() : this {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }

    serialize() : AnyObject {
        let serialized: AnyObject = {};

        for(let key in this){
            if(!isNonSerializable(this, key)){
                let val: AnyObject = this[key];

                if(Array.isArray(val)){
                    const arr = [];
                    for(let elem of val){
                        if(elem instanceof Model) elem = elem.serialize();
                        arr.push(elem);
                    }

                    val = arr;
                }else if(val instanceof Model){
                    val = val.serialize();
                }

                serialized[key] = val;
            }
        }

        return serialized;
    }

    // Equivalent to {...this, ...params} in standard objects
    concat(params: Partial<Model>){
        Object.assign(this, params);
    }

    // Same as concat but returns a new model instance to force re-render
    with(params: Partial<Model>) : this {
        this.concat(params);
        return this.newInstance();
    }
}

export enum UserRole {
    ADVISOR = 'ADVISOR',
    STUDENT = 'STUDENT',
    ADMIN = 'ADMIN'
}

export class Permission extends Model {
    email: string;
    drive_permissions?: Map<string, string> = {} as Map<string, string>;

    // Temporary field to indicate permission needs to be cleared
    @NonSerializable
    awaiting_delete?: boolean;

    concat(params: Partial<Permission>){
        super.concat(params);
    }

    with(params: Partial<Permission>) : this {
        return super.with(params);
    }

    constructor(params: Partial<Permission>){
        super();
        this.concat(params);
    }
}

export class User extends Model {
    email: string;
    name: string;
    bio_pic: string;
    bio?: string = '';
    role?: UserRole = UserRole.STUDENT;
    shared_with?: Permission[] = [];
    shared_with_email?: string[] = [];

    serialize() : AnyObject {
        if(this.shared_with){
            // Auto-generate index array for easier queries
            this.shared_with_email = this.shared_with.map(permission => permission.email);
        }

        return super.serialize();
    }

    concat(params: Partial<User>){
        super.concat(params);
    }

    with(params: Partial<User>) : this {
        return super.with(params);
    }

    constructor(params: Partial<User>){
        super();
        this.concat(params);
    }
}

export class FileCollection extends Model {
    drive_id: string;
    author_id: string;

    @NonSerializable
    title?: string = '';
    @NonSerializable
    web_view: string;

    concat(params: Partial<FileCollection>){
        super.concat(params);
    }

    with(params: Partial<FileCollection>) : this {
        return super.with(params);
    }

    constructor(params: Partial<FileCollection>){
        super();
        this.concat(params);
    }
}

export class Artifact extends Model {
    drive_id: string;
    shortcut_id: string;
    author_id: string;

    @NonSerializable
    title: string;
    @NonSerializable
    icon: string;
    @NonSerializable
    thumbnail: string;
    @NonSerializable
    web_view: string;
    @NonSerializable
    description?: string = '';

    // Temporary field to indicate the artifact needs to be deleted
    @NonSerializable
    awaiting_delete?: boolean;

    concat(params: Partial<Artifact>){
        super.concat(params);
    }

    with(params: Partial<Artifact>) : this {
        return super.with(params);
    }

    constructor(params: Partial<Artifact>){
        super();
        this.concat(params);
    }
}

export class Post extends Model {
    created_at: Timestamp;
    author_id: string;
    title?: string = '';
    body?: string = '';
    tags?: string[] = [];
    likes?: string[] = [];

    // Temporary field to indicate the post hasn't been saved
    @NonSerializable
    awaiting_save?: boolean

    concat(params: Partial<Post>){
        super.concat(params);
    }

    with(params: Partial<Post>) : this {
        return super.with(params);
    }

    constructor(params: Partial<Post>){
        super();
        this.concat(params);
    }
}

export class Comment extends Model {
    author_id: string;
    created_at: Timestamp;
    body?: string = '';

    // Temporary field to indicate the comment hasn't been saved
    @NonSerializable
    awaiting_save?: boolean;

    concat(params: Partial<Comment>){
        super.concat(params);
    }

    with(params: Partial<Comment>) : this {
        return super.with(params);
    }

    constructor(params: Partial<Comment>){
        super();
        this.concat(params);
    }
}

export class TokenRecord extends Model {
    // ID will represent OAuth token, so should not initialize as dbid()
    @NonSerializable
    id: string = null;

    expires: number;
    user_id: string;

    concat(params: Partial<TokenRecord>){
        super.concat(params);
    }

    with(params: Partial<TokenRecord>) : this {
        return super.with(params);
    }

    constructor(params: Partial<TokenRecord>){
        super();
        this.concat(params);
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

class Converter<Schema extends Model> {
    constructor(private SchemaType){ }

    toFirestore = (instance: Schema) => instance.serialize();
    fromFirestore = (snapshot: firebase.firestore.QueryDocumentSnapshot) : Schema => new this.SchemaType({
        ...snapshot.data(),
        id: snapshot.id
    });
}

class CollectionFactory {
    store: firebase.firestore.Firestore;

    constructor(store: firebase.firestore.Firestore){
        this.store = store;
    }

    new<Schema extends Model>(name: string, SchemaType){
        const converter = new Converter<Schema>(SchemaType);
        return this.store.collection(name).withConverter(converter);
    }
}

const store = app.firestore();
const bucket = app.storage().ref();
const auth = app.auth();
const cf = new CollectionFactory(store);

type CollectionReference<T extends Model> = firebase.firestore.CollectionReference<T>;
type CollectionChild<T extends Model> = (parentId: string) => CollectionReference<T>;
type DriveReference = (client: any) => Promise<DriveDB>;
type BucketReference = (filename: string) => firebase.storage.Reference;

interface Db {
    users: CollectionReference<User>;
    file_collections: CollectionReference<FileCollection>;
    posts: CollectionReference<Post>;
    token_records: CollectionReference<TokenRecord>;
    comments: CollectionChild<Comment>;
    artifacts: CollectionChild<Artifact>;

    setCredentials: (token: string) => Promise<void>;
    generateToken: (uid: string) => string;

    storage: BucketReference;
    avatars: BucketReference;
    drive: DriveReference;
}

let db: Db = {
    // Firestore collections
    users: cf.new<User>('users', User),
    file_collections: cf.new<FileCollection>('file_collections', FileCollection),
    posts: cf.new<Post>('posts', Post),
    token_records: cf.new<TokenRecord>('token_records', TokenRecord),
    comments: (postId: string) => cf.new<Comment>('posts/' + postId + '/comments', Comment),
    artifacts: (collectionId: string) => cf.new<Artifact>('file_collections/' + collectionId + '/artifacts', Artifact),

    // Set Firebase auth credentials
    setCredentials: async (token: string) => {
        await auth.signInWithCustomToken(token);
    },
    generateToken: (uid: string) => {
        return uid;
    },

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

    static exec_safe<T, K, Z extends any[]>(cb: (main: T, ...args: Z) => Promise<K>){
        return async (a: T, ...b: Z) : Promise<K> => {
            try {
                return await cb(a, ...b);
            }catch(e){
                if(e.message.trim() === 'OAuth session is no longer valid'){
                    signOut();
                }

                throw e;
            }
        }
    }

    artifacts: DriveHandler<Artifact> = {

        load: DriveDB.exec_safe(async (artifact: Artifact) => {
            const snapshot = await this.client.drive.files.get({
                fileId: artifact.drive_id,
                fields: 'name,iconLink,thumbnailLink,webViewLink,description'
            });
            const metadata = snapshot.result;

            if(metadata){
                return artifact.with({
                    title: metadata.name,
                    icon: metadata.iconLink,
                    thumbnail: metadata.thumbnailLink,
                    web_view: metadata.webViewLink,
                    description: metadata.description || ''
                });
            }

            return artifact;
        }),

        save: DriveDB.exec_safe(async (artifact: Artifact, collection_drive_id?: string) => {
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
                            description: artifact.description,
                            shortcutDetails: {
                                targetId: artifact.drive_id
                            }
                        },
                        fields: 'id'
                    });

                    artifact = artifact.with({shortcut_id: snapshot.result.id});
                }else{
                    await this.client.drive.files.update({
                        resource: {
                            description: artifact.description
                        },
                        fileId: artifact.shortcut_id
                    })
                }
            }

            return artifact;
        }),

        remove: DriveDB.exec_safe(async (artifact: Artifact) => {
            await this.artifacts.save(artifact.with({awaiting_delete: true}));
        }),

    };

    file_collections: DriveHandler<[FileCollection, Artifact[]]> = {

        save: DriveDB.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]]) : Promise<[FileCollection, Artifact[]]> => {
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
        }),

        load: DriveDB.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]]) : Promise<[FileCollection, Artifact[]]> => {
            const snapshot = await this.client.drive.files.get({
                fileId: collection.drive_id,
                fields: 'name,webViewLink'
            });
            const metadata = snapshot.result;

            artifacts = await Promise.all(artifacts.map(
                async artifact => await this.artifacts.load(artifact)
            ));

            return [
                collection.with({
                    title: metadata.name,
                    web_view: metadata.webViewLink
                }),
                artifacts
            ];
        }),

        remove: DriveDB.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]]) => {
            await this.client.drive.files.delete({
                fileId: collection.drive_id
            });

            await Promise.all(artifacts.map(
                async artifact => await this.artifacts.remove(artifact)
            ));
        }),

        share: DriveDB.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]], permission: Permission) => {
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
        }),

        unshare: DriveDB.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]], permission: Permission) => {
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
        }),

        set_access: DriveDB.exec_safe(async (state: [FileCollection, Artifact[]], permission: Permission) => {
            return await this.file_collections[permission.awaiting_delete ? 'unshare' : 'share'](state, permission);
        })
    };

}

// Virtual (not directly loaded from db) model fields
db.drive = DriveDB.exec_safe(DriveDB.init);

export default db;
