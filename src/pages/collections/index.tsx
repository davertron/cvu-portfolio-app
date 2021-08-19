import { Authorization } from '../../lib/authorization';
import Layout from '../../lib/components/Layout';
import Error from '../../lib/components/Error';
import Button, { Cta } from '../../lib/components/Button';
import db from '../../lib/db/client';
import { User, FileCollection } from '../../lib/db/models';
import { loadStarted, merge, classNames } from '../../lib/util';
import { useSession } from 'next-auth/client';
import { useState, useEffect } from 'react';
import { MdOpenInNew, MdAdd, MdClose } from 'react-icons/md';
import Link from 'next/link';

export default function Collection() {
    const [session, loading] = useSession();

    const [collections, setCollections] = useState([] as FileCollection[]);
    const [artifacts, setArtifacts] = useState(new Map() as Map<string, number>);
    const [posts, setPosts] = useState(new Map() as Map<string, number>);
    const [user, setUser] = useState(new User({}));
    const [error, setError] = useState(null);

    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    async function getData() {
        try {
            setDbLoaded(null);

            const userSnapshot = await db.users.doc(session.user.id).get();
            const dbUser = userSnapshot.data();

            const snapshot = await db.file_collections.where('author_id', '==', session.user.id).get();
            const dbCollections = snapshot.docs.map((doc) => doc.data());
            const dbArtifacts: Map<string, number> = new Map();
            const dbPosts: Map<string, number> = new Map();

            for (let i = 0; i < dbCollections.length; i++) {
                const collection = dbCollections[i];

                const artifactsSnapshot = await db.artifacts(collection.id).get();
                dbArtifacts[collection.id] = artifactsSnapshot.docs.length;

                const postsSnapshot = await db.posts.where('tags', 'array-contains', collection.id).get();
                dbPosts[collection.id] = postsSnapshot.docs.length;
            }

            setCollections((currentCollections) =>
                merge<FileCollection>(dbCollections, currentCollections, 'drive_id')
            );
            setPosts(dbPosts);
            setArtifacts(dbArtifacts);
            setUser(dbUser);

            setDbLoaded(true);
        } catch (_e) {
            setError('There was an error loading your collections');
        }
    }

    async function getDriveData(client) {
        try {
            setDriveLoaded(null);

            const drive = await db.drive(client);
            const updated = await Promise.all(
                collections.map(async (collection) => {
                    const [driveCollection] = await drive.file_collections.load([collection, []]);
                    return driveCollection;
                })
            );

            setCollections(updated);
            setDriveLoaded(true);
        } catch (_e) {
            setError('There was an error syncing with drive');
        }
    }

    async function remove(client, collection: FileCollection) {
        try {
            if (confirm('Are you sure you want to delete collection "' + collection.title + '"?')) {
                const snapshot = await db.artifacts(collection.id).get();
                const collectionArtifacts = snapshot.docs.map((doc) => doc.data());
                const drive = await db.drive(client);

                for (let permission of user.shared_with) {
                    await drive.file_collections.unshare([collection, collectionArtifacts], permission);
                }

                await drive.file_collections.remove([collection, []]);
                await db.file_collections.doc(collection.id).delete();

                setArtifacts((currentArtifacts) => ({ ...currentArtifacts, [collection.id]: undefined }));
                setCollections((currentCollections) => currentCollections.filter((c) => c.id != collection.id));
            }
        } catch (_e) {
            setError('There was an error deleting the collection');
        }
    }

    useEffect(() => {
        if (!loading && !loadStarted(dbLoaded)) {
            getData();
        }

        if (dbLoaded && !loadStarted(driveLoaded) && apisLoaded) {
            getDriveData(window.gapi.client);
        }
    }, [loading, dbLoaded, driveLoaded, apisLoaded]);

    return (
        <Layout authorization={Authorization.USER} gapis={[]} onGapisLoad={() => setApisLoaded(true)} noPadding>
            <div className="flex flex-col items-center bg-gradient-to-r from-indigo-300 to-purple-700 w-full py-16 text-white">
                <h1 className="font-bold text-3xl text-center">Your collections</h1>
            </div>
            {error && (
                <div className="w-full">
                    <Error error={error} />
                </div>
            )}
            <div className="flex flex-wrap justify-center py-3 px-5">
                {dbLoaded &&
                    (collections?.length > 0 ? (
                        <>
                            {collections.map((collection) => (
                                <div key={collection.id}>
                                    <div className="m-4 bg-purple-100 shadow rounded w-56">
                                        <div className="text-gray-600 px-4 pt-1 pb-2">
                                            <div className="flex items-start">
                                                <p
                                                    className={classNames(
                                                        'text-lg font-bold my-2 h-full flex-grow',
                                                        !collection.web_view && 'text-red-300'
                                                    )}
                                                >
                                                    {collection.title}
                                                </p>
                                                {posts[collection.id] == 0 && (
                                                    <Button
                                                        className="py-3"
                                                        onClick={async () =>
                                                            await remove(window.gapi.client, collection)
                                                        }
                                                        customPadding
                                                    >
                                                        <MdClose />
                                                    </Button>
                                                )}
                                            </div>
                                            <p className="my-2 text-gray-600">
                                                {artifacts[collection.id] || 0} artifact
                                                {artifacts[collection.id] != 1 && 's'}
                                                <>
                                                    {' '}
                                                    | {posts[collection.id]} post{posts[collection.id] != 1 && 's'}
                                                </>
                                            </p>
                                        </div>
                                        <Button
                                            icon={<MdOpenInNew />}
                                            className="bg-purple-300 rounded-b w-full hover:text-white hover:bg-purple-500"
                                            href={'/collections/' + collection.id}
                                            customRounding
                                        >
                                            View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            <Cta
                                className="m-4 w-28 text-center flex items-center justify-center bg-gray-100 text-gray-500 bg-gradient-to-r hover:from-purple-500 hover:to-indigo-500 hover:text-white"
                                href="/collections/new"
                                customBg
                            >
                                <MdAdd size="2em" />
                            </Cta>
                        </>
                    ) : (
                        <p className="text-center py-10 text-lg">
                            You don't have any collections yet.{' '}
                            <Link href="/collections/new">
                                <a className="text-blue-500 hover:underline">Add one</a>
                            </Link>
                        </p>
                    ))}
            </div>
        </Layout>
    );
}
