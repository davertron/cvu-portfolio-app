import { Artifact, FileCollection, Permission } from './models';
import { getSession, signOut } from 'next-auth/client';

export interface DriveHandler<T> {
    load?: (obj: T, ...args: string[]) => Promise<T>;
    save?: (obj: T, ...args: string[]) => Promise<T>;
    remove?: (obj: T, ...args: string[]) => Promise<void>;
    share?: (obj: T, permission: Permission, ...args: string[]) => Promise<Permission>;
    unshare?: (obj: T, permission: Permission, ...args: string[]) => Promise<Permission>;
    set_access?: (obj: T, permission: Permission, ...args: string[]) => Promise<Permission> | Promise<null>;
}

// Handles drive-based schema attributes
export default class DriveDb {
    client;

    constructor(client, token: string){
        client.setToken({access_token: token});
        this.client = client;
    }

    static async init(client) : Promise<DriveDb> {
        const session = await getSession();

        if(!session.error){
            return new DriveDb(client, session.accessToken);
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
                if(e.message?.trim?.() === 'OAuth session is no longer valid'){
                    signOut();
                }

                throw e;
            }
        }
    }

    artifacts: DriveHandler<Artifact> = {

        load: DriveDb.exec_safe(async (artifact: Artifact) => {
            try {
                const snapshot = await this.client.drive.files.get({
                    fileId: artifact.drive_id,
                    fields: '*'//'name,type,iconLink,thumbnailLink,webViewLink,mimeType,description'
                });
                const metadata = snapshot.result;
                // Increase default thumbnail size
                const thumbnail = metadata.thumbnailLink ? metadata.thumbnailLink.replace('s220', 's500') : '';

                if(metadata){
                    return artifact.with({
                        title: metadata.name,
                        icon: metadata.iconLink,
                        thumbnail: thumbnail,
                        web_view: metadata.webViewLink,
                        mimeType: metadata.mimeType,
                        description: metadata.description || ''
                    });
                }
            }catch(_e){
                return artifact.with({
                    title: 'Artifact not found',
                    mimeType: '.error',
                    description: `Could not find file with id '${artifact.drive_id}'. Did you delete it from Drive?`
                });
            }

            return artifact;
        }),

        save: DriveDb.exec_safe(async (artifact: Artifact, collection_drive_id?: string) => {
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

        remove: DriveDb.exec_safe(async (artifact: Artifact) => {
            await this.artifacts.save(artifact.with({awaiting_delete: true}));
        })

    };

    file_collections: DriveHandler<[FileCollection, Artifact[]]> = {

        save: DriveDb.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]]) : Promise<[FileCollection, Artifact[]]> => {
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

        load: DriveDb.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]]) : Promise<[FileCollection, Artifact[]]> => {
            let snapshot;
            let metadata;

            try {
                snapshot = await this.client.drive.files.get({
                    fileId: collection.drive_id,
                    fields: 'name,webViewLink'
                });
                metadata = snapshot.result;
            }catch(_e){
                return [
                    collection.with({
                        title: 'Collection not found in Drive'
                    }),
                    []
                ]
            }

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

        remove: DriveDb.exec_safe(async ([collection, _artifacts]: [FileCollection, Artifact[]]) => {
            await this.client.drive.files.delete({
                fileId: collection.drive_id
            });
        }),

        share: DriveDb.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]], permission: Permission) => {
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

        unshare: DriveDb.exec_safe(async ([collection, artifacts]: [FileCollection, Artifact[]], permission: Permission) => {
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

        set_access: DriveDb.exec_safe(async (state: [FileCollection, Artifact[]], permission: Permission) => {
            return await this.file_collections[permission.awaiting_delete ? 'unshare' : 'share'](state, permission);
        })
    };

}
