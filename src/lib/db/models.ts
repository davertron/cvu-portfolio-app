import 'reflect-metadata';

// Schema definitions
import { dbid, now, Timestamp } from './util';

// Annotation to prevent field from being saved to Firestore
function NonSerializable(target, propertyKey) {
    Reflect.defineMetadata('isNonSerializable', true, target, propertyKey);
}

function isNonSerializable<T>(instance: T, propertyKey: string) {
    return !!Reflect.getMetadata('isNonSerializable', instance, propertyKey);
}

// Annotation to prevent field from being returned by Firestore
function Hidden(target, propertyKey) {
    Reflect.defineMetadata('Hidden', true, target, propertyKey);
}

function isHidden<T>(instance: T, propertyKey: string) {
    return !!Reflect.getMetadata('Hidden', instance, propertyKey);
}

// Generic object type
type AnyObject = { [key: string]: any };

export class Model {
    @NonSerializable
    id?: string = dbid();

    // Creates a new model instance to force re-render in setState methods
    protected newInstance(): this {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }

    serialize(): AnyObject {
        let serialized: AnyObject = {};

        for (let key in this) {
            if (!isNonSerializable(this, key)) {
                let val: AnyObject = this[key];

                if (Array.isArray(val)) {
                    const arr = [];
                    for (let elem of val) {
                        if (elem instanceof Model) elem = elem.serialize();
                        arr.push(elem);
                    }

                    val = arr;
                } else if (val instanceof Model) {
                    val = val.serialize();
                }

                serialized[key] = val;
            }
        }

        return serialized;
    }

    // Equivalent to {...this, ...params} in standard objects
    concat(params: Partial<Model>) {
        Object.assign(this, params);
    }

    // Same as concat but returns a new model instance to force re-render
    with(params: Partial<Model>): this {
        this.concat(params);
        return this.newInstance();
    }
}

export enum UserRole {
    ADVISOR = 'ADVISOR',
    STUDENT = 'STUDENT',
    ADMIN = 'ADMIN',
}

export class Permission extends Model {
    email: string;
    drive_permissions?: Map<string, string> = {} as Map<string, string>;

    // Temporary field to indicate permission needs to be cleared
    @NonSerializable
    awaiting_delete?: boolean;

    concat(params: Partial<Permission>) {
        super.concat(params);
    }

    with(params: Partial<Permission>): this {
        return super.with(params);
    }

    constructor(params: Partial<Permission>) {
        super();
        this.concat(params);
    }
}

export class User extends Model {
    email: string;
    name: string;
    bio_pic?: {
        url: string;
        name: string;
    };
    image: string;
    bio?: string = '';
    role?: UserRole = UserRole.STUDENT;
    shared_with?: Permission[] = [];
    shared_with_email?: string[] = [];

    serialize(): AnyObject {
        if (this.shared_with) {
            // Auto-generate index array for easier queries
            this.shared_with_email = this.shared_with.map((permission) => permission.email);
        }

        return super.serialize();
    }

    concat(params: Partial<User>) {
        super.concat(params);
    }

    with(params: Partial<User>): this {
        return super.with(params);
    }

    constructor(params: Partial<User>) {
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

    concat(params: Partial<FileCollection>) {
        super.concat(params);
    }

    with(params: Partial<FileCollection>): this {
        return super.with(params);
    }

    constructor(params: Partial<FileCollection>) {
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
    mimeType: string;
    @NonSerializable
    description?: string = '';

    // Temporary field to indicate the artifact needs to be deleted
    @NonSerializable
    awaiting_delete?: boolean;

    concat(params: Partial<Artifact>) {
        super.concat(params);
    }

    with(params: Partial<Artifact>): this {
        return super.with(params);
    }

    constructor(params: Partial<Artifact>) {
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
    awaiting_save?: boolean;

    concat(params: Partial<Post>) {
        super.concat(params);
    }

    with(params: Partial<Post>): this {
        return super.with(params);
    }

    constructor(params: Partial<Post>, creating?: boolean) {
        super();
        creating ? this.concat({ ...params, created_at: now() }) : this.concat(params);
    }
}

export class Comment extends Model {
    post_author_id: string;
    author_id: string;
    created_at: Timestamp;
    body?: string = '';

    // Temporary field to indicate the comment hasn't been saved
    @NonSerializable
    awaiting_save?: boolean;

    concat(params: Partial<Comment>) {
        super.concat(params);
    }

    with(params: Partial<Comment>): this {
        return super.with(params);
    }

    constructor(params: Partial<Comment>, creating?: boolean) {
        super();
        creating ? this.concat({ ...params, created_at: now() }) : this.concat(params);
    }
}
