// Base definition for client and server datasource classes
import { Model, User, FileCollection, Artifact, Post, Comment } from './models';

import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/storage';

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

type CollectionReference<T extends Model> = firebase.firestore.CollectionReference<T>;
type CollectionChild<T extends Model> = (parentId: string) => CollectionReference<T>;

// Abstract base Db class
export default class Db {
    users: CollectionReference<User>;
    file_collections: CollectionReference<FileCollection>;
    posts: CollectionReference<Post>;
    comments: CollectionChild<Comment>;
    artifacts: CollectionChild<Artifact>;

    // Types here are "any" for compatibility with admin SDK, which can't be imported here (since this code may run on the client-side)
    app: any;
    store: any;
    auth: any;

    constructor(app: any){
        this.app = {firestore: () => 0, auth: () => 0};
        this.store = app.firestore();
        this.auth = app.auth();

        const cf = new CollectionFactory(this.store);

        this.users = cf.new<User>('users', User);
        this.file_collections = cf.new<FileCollection>('file_collections', FileCollection);
        this.posts = cf.new<Post>('posts', Post);
        // TODO: Remove this
        this.comments = (postId: string) => cf.new<Comment>('posts/' + postId + '/comments', Comment);
        this.artifacts = (collectionId: string) => cf.new<Artifact>(
            `file_collections/${collectionId}/artifacts`,
            Artifact
        );
    }

    async setCredentials(token: string){
        await this.auth.signInWithCustomToken(token);
    }
}
