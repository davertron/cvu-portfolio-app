import { Authorization } from '../../lib/authorization';
import Layout from '../../lib/components/Layout';
import Input, { StateSetter } from '../../lib/components/Input';
import Cta from '../../lib/components/Cta';
import Picker from '../../lib/components/Picker';
import Error from '../../lib/components/Error';
import db, { id as dbid, FileCollection, Artifact } from '../../lib/db';
import { classNames } from '../../lib/util';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { MdCloudUpload, MdClose, MdSave } from 'react-icons/md';
import NProgress from 'nprogress';

export default function Collection(){
    const [session, loading] = useSession();

    const [collection, setCollection] = useState({
        title: ''
    } as FileCollection);
    const [artifacts, setArtifacts] = useState([] as Artifact[]);
    const [artifactIds, setArtifactIds] = useState([]);

    const [editing, setEditing] = useState(false);
    const [saveDisabled, setSaveDisabled] = useState(false);

    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    const [error, setError] = useState(null);

    const router = useRouter();
    const { id } = router.query;
    const creating = id == 'new';
    const showInputs = creating || editing;

    const setArtifact = (i: number) => {
        return (cb: StateSetter) => {
            setArtifacts(currentArtifacts => currentArtifacts.map((a, j) => j == i ? cb(a) : a));
        }
    }

    const validate = (collection: FileCollection, artifacts: Artifact[]) => (collection.title && collection.title.trim() != '' && artifacts.length > 0);

    async function getData(cid: string){
        try {
            const snapshot = await db.file_collections.doc(cid).get();
            const dbCollection = snapshot.data();

            const artifactsSnapshot = await db.artifacts(cid).get();
            const dbArtifacts = artifactsSnapshot.docs.map(doc => doc.data());

            setArtifacts(dbArtifacts);
            setArtifactIds(artifactsSnapshot.docs.map(doc => doc.id));
            setCollection(dbCollection);

            setDbLoaded(true);
        }catch(_e){
            setError('There was an error loading collection ' + id);
        }
    }

    async function getDriveData(client){
        try {
            const [driveCollection, driveArtifacts] = await db.drive(client).file_collections.load([
                collection,
                artifacts
            ]);

            setCollection(driveCollection);
            setArtifacts(driveArtifacts);

            setDriveLoaded(true);
        }catch(_e){
            setError('There was an error syncing with Google Drive')
        }
    }

    async function save(client){
        NProgress.start();
        setSaveDisabled(true);

        try {
            const [driveCollection, driveArtifacts] = await db.drive(client).file_collections.save([
                collection,
                artifacts
            ]);

            if(creating){
                const collectionId = dbid();
                await db.file_collections.doc(collectionId).set({
                    drive_id: driveCollection.drive_id,
                    author_id: session.user.id
                });

                await Promise.all(
                    driveArtifacts.map(async artifact => {
                        const artifactId = dbid();

                        await db.artifacts(collectionId).doc(artifactId).set({
                            drive_id: artifact.drive_id
                        });
                    })
                );

                router.push('/collections/' + collectionId);
            }else{
                db.file_collections.doc(id as string).set({
                    drive_id: driveCollection.drive_id,
                    author_id: session.user.id
                });

                driveArtifacts.map((artifact, i) => {
                    db.artifacts(id as string).doc(artifactIds[i]).set({
                        drive_id: artifact.drive_id
                    });
                });

                setEditing(false);
            }
        }catch(e){
            setError(`An error ${e.status ? `(${e.status})` : ''} was encountered while saving this collection`);
        }

        setSaveDisabled(false);
        NProgress.done();
    }

    useEffect(() => {
        if(session && !loading && !creating && !dbLoaded){
            getData(id as string);
        }

        if(dbLoaded && !driveLoaded && apisLoaded){
            getDriveData(window.gapi.client);
        }
    }, [loading, dbLoaded, driveLoaded, apisLoaded]);

    return (
        <Layout
            authorization={Authorization.USER}
            gapis={['picker']}
            onGapisLoad={() => setApisLoaded(true)}
            noPadding
        >
            <div className="flex flex-col items-center bg-gradient-to-r from-purple-400 to-indigo-500 w-full py-16 text-white">
                <div>
                    {showInputs ?
                        <Input
                            type="text"
                            placeholder="Collection Title"
                            className="font-bold text-2xl text-center bg-gray-100 bg-opacity-0 focus:bg-opacity-10 placeholder-gray-300"
                            setForm={setCollection}
                            value={collection.title}
                            name="title"
                            customBg
                        />
                        :
                        <h1 className="font-bold text-2xl text-center">{collection.title}</h1>
                    }
                </div>
                {showInputs && <div className="my-7">
                    <Picker
                        scope={[]}
                        onInput={async picked => {
                            if(picked.docs){
                                let updated = [];

                                for(let i = 0; i < picked.docs.length; i++){
                                    const doc = picked.docs[i];

                                    if(artifacts.filter(a => a.drive_id == doc.id).length == 0){
                                        let artifact: Artifact = {drive_id: doc.id, awaiting_copy: true};
                                        artifact = await db.drive(window.gapi.client).artifacts.load(artifact);

                                        updated.push(artifact);
                                    }
                                }

                                setArtifacts(currentArtifacts => [...currentArtifacts, ...updated]);
                            }
                        }}
                        viewId="DOCS"
                        multiple
                    >
                        <Cta invert>
                            <><MdCloudUpload className="inline mr-3"/>Add files from Drive</>
                        </Cta>
                    </Picker>
                </div>}
            </div>
            {error && <div className="w-full">
                <Error error={error}/>
            </div>}
            <div className="flex flex-wrap justify-center w-full rounded py-3 px-5 text-gray-600 mb-12">
                {artifacts.map((artifact, i) => (
                    !artifact.awaiting_delete && <div key={i} className="m-4 w-80">
                        <div className="rounded shadow">
                            <div
                                className="transition-all rounded-t relative group"
                                style={{
                                    backgroundImage: `url(https://lh3.google.com/u/1/d/1Q6P_uxijw2eGvHkcwmgKK5QGWgWKBUrSNzMFzbmWn7I=w250-h238-p-k-nu-iv29)`,
                                    backgroundSize: 'cover',
                                    minHeight: '200px'
                                }}
                            >
                                <div
                                    className={classNames(
                                        'transition-all p-4 bg-white h-full w-full absolute text-gray-500 rounded-t',
                                        showInputs ? 'opacity-100 bg-opacity-90' : 'opacity-0 group-hover:opacity-100 group-hover:bg-opacity-90'
                                    )}
                                >
                                    {showInputs ?
                                        <div className="flex flex-row items-start">
                                            <Input
                                                type="textarea"
                                                placeholder="Enter artifact description"
                                                name={'description_' + i}
                                                className="h-full flex-grow"
                                                value={artifact.description}
                                                setForm={setArtifact(i)}
                                                customBg
                                                noPadding
                                            />
                                            <button
                                                className="focus:outline-none focus:text-gray-600"
                                                onClick={() => {
                                                    if(creating){
                                                        setArtifacts(currentArtifacts => currentArtifacts.filter((_a, j) => j != i));
                                                    }else{
                                                        setArtifact(i)(currentArtifact => ({...currentArtifact, awaiting_delete: true}));
                                                    }
                                                }}
                                            >
                                                <MdClose/>
                                            </button>
                                        </div>
                                        :
                                        <p>{artifact.description}</p>
                                    }
                                </div>
                            </div>
                            <div className="bg-gray-100 px-4 py-3 rounded-b text-gray-600 flex flex-row items-start shadow shadow-t-0">
                                <img src={artifact.icon} className="w-auto h-5 pr-3 pt-1"/>
                                <div>{artifact.title}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {(creating || session && collection.author_id == session.user.id) &&
                <div className="w-full py-4 fixed bottom-0 border border-top flex flex-row justify-center z-10">
                    {showInputs ?
                        <>
                            {validate(collection, artifacts) && !saveDisabled ?
                                <>
                                    <Cta
                                        onClick={() => save(window.gapi.client)}
                                        className="mx-2"
                                    >
                                        Save
                                    </Cta>

                                    <button
                                        onClick={() => setEditing(false)}
                                        className="border rounded px-3 py-2 border-indigo-500 text-indigo-500 hover:text-white hover:bg-indigo-500 transition-all mx-2"
                                    >
                                        Cancel
                                    </button>
                                </>
                                :
                                <Cta className="bg-gray-200 text-gray-400 cursor-default" customBg customFont>Save</Cta>
                            }
                        </>
                        :
                        <button
                            onClick={() => setEditing(true)}
                            className="border rounded px-3 py-2 border-indigo-500 text-indigo-500 hover:text-white hover:bg-indigo-500 transition-all"
                        >
                            Edit
                        </button>
                    }
                </div>
            }
        </Layout>
    );
}

// Forces page state to reset after [id] is changed (URL param changes are shallow by default)
export async function getServerSideProps(ctx){
    return {props: {key: Number(new Date())}};
}
