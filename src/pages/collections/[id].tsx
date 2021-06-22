import { Authorization } from '../../lib/authorization';
import Layout from '../../lib/components/Layout';
import Input, { StateSetter } from '../../lib/components/Input';
import Button, { Cta } from '../../lib/components/Button';
import Picker from '../../lib/components/Picker';
import Error from '../../lib/components/Error';
import db, { id as dbid, FileCollection, Artifact } from '../../lib/db';
import { classNames } from '../../lib/util';
import { Interactive } from '../../lib/components/types';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { MdCloudUpload, MdClose, MdDoneAll, MdEdit, MdOpenInNew, MdStar, MdStarBorder } from 'react-icons/md';
import { CgFeed } from 'react-icons/cg';
import NProgress from 'nprogress';

interface CollectionProps {
    creating?: boolean
}

export default function Collection(props: CollectionProps){
    const [session, loading] = useSession();

    const [collection, setCollection] = useState({
        title: ''
    } as FileCollection);
    const [artifacts, setArtifacts] = useState([] as Artifact[]);

    const [editing, setEditing] = useState(false);
    const [saveDisabled, setSaveDisabled] = useState(false);

    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    const [error, setError] = useState(null);

    const router = useRouter();
    const { id } = router.query;
    const showInputs = props.creating || editing;

    const removeArtifact = (aid: string) => {
        return () => {
            setArtifacts(currentArtifacts => currentArtifacts.filter(artifact => artifact.id == aid))
        }
    }

    const setArtifact = (aid: string) => {
        return (cb: StateSetter) => {
            setArtifacts(currentArtifacts => currentArtifacts.map(a => a.id == aid ? cb(a) : a));
        }
    }

    const validate = (collection: FileCollection, artifacts: Artifact[]) => (collection.title && collection.title.trim() != '');

    async function getData(cid: string){
        try {
            const snapshot = await db.file_collections.doc(cid).get();
            const dbCollection = snapshot.data();

            if(dbCollection){
                const artifactsSnapshot = await db.artifacts(cid).get();
                const dbArtifacts = artifactsSnapshot.docs.map(doc => doc.data());

                setArtifacts(dbArtifacts);
                setCollection(dbCollection);

                setDbLoaded(true);
            }else{
                setError('Collection `' + id + '` not found');
            }
        }catch(_e){
            setError('There was an error loading collection ' + id);
        }
    }

    async function getDriveData(client){
        try {
            const drive = await db.drive(client);
            const [driveCollection, driveArtifacts] = await drive.file_collections.load([
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
            const drive = await db.drive(client);
            const [driveCollection, driveArtifacts] = await drive.file_collections.save([
                collection,
                artifacts
            ]);

            if(props.creating){
                const collectionId = dbid();
                await db.file_collections.doc(collectionId).set({
                    drive_id: driveCollection.drive_id,
                    author_id: session.user.id
                });

                await Promise.all(
                    driveArtifacts.map(async artifact => {
                        await db.artifacts(collectionId).doc(artifact.id).set({
                            drive_id: artifact.drive_id,
                            shortcut_id: artifact.shortcut_id
                        });
                    })
                );

                setArtifacts([]);
                setCollection({title: ''});
                router.push('/collections/' + collectionId);
            }else{
                db.file_collections.doc(id as string).set({
                    drive_id: driveCollection.drive_id,
                    author_id: session.user.id
                });

                driveArtifacts.map(artifact => {
                    const doc = db.artifacts(id as string).doc(artifact.id);

                    if(artifact.awaiting_delete){
                        doc.delete();
                    }else{
                        doc.set({
                            drive_id: artifact.drive_id,
                            shortcut_id: artifact.shortcut_id
                        });
                    }
                });

                setArtifacts(currentArtifacts => currentArtifacts.filter(artifact => !artifact.awaiting_delete));
                setEditing(false);
            }
        }catch(e){
            console.log(e)
            setError(`An error ${e.status ? `(${e.status})` : ''} was encountered while saving this collection`);
        }

        setSaveDisabled(false);
        NProgress.done();
    }

    useEffect(() => {
        if(session && !loading && !props.creating && !dbLoaded){
            getData(id as string);
        }

        if(dbLoaded && !driveLoaded && apisLoaded){
            getDriveData(window.gapi.client);
        }
    }, [loading, dbLoaded, driveLoaded, apisLoaded, id]);

    return (
        <Layout
            authorization={Authorization.USER}
            gapis={['picker']}
            onGapisLoad={() => setApisLoaded(true)}
            noPadding
        >
            {session &&
                <>
                    <div className="flex flex-col items-center bg-gradient-to-r from-indigo-300 to-purple-700 w-full text-white h-52 justify-center">
                        <div className="my-2 w-full">
                            {(showInputs && !saveDisabled) ?
                                <div className="mx-auto w-427px">
                                    <Input
                                        type="datalist"
                                        placeholder="Collection Title"
                                        className="bg-gray-300 bg-opacity-10 placeholder-gray-100 text-white focus:shadow-xl text-2xl font-bold"
                                        listClassname="bg-purple-400 bg-opacity-40 text-white backdrop-blur shadow-lg"
                                        setForm={setCollection}
                                        value={collection.title || ''}
                                        name="title"
                                        options={[
                                            'Creative and Practical Problem Solving',
                                            'Clear and Effective Communication',
                                            'Informed and Integrative Thinking',
                                            'Self Direction'
                                        ]}
                                        customBg
                                    />
                                </div>
                                :
                                <h1 className="font-bold text-2xl text-center my-2">{collection.title}</h1>
                            }
                        </div>
                        <div className="my-4">
                            {(showInputs && !saveDisabled) ?
                                <Picker
                                    scope={[]}
                                    onInput={async picked => {
                                        if(picked.docs){
                                            let updated = [];
                                            const drive = await db.drive(window.gapi.client);

                                            for(let i = 0; i < picked.docs.length; i++){
                                                const doc = picked.docs[i];

                                                if(artifacts.filter(a => a.drive_id == doc.id).length == 0){ // Make sure document is not a duplicate
                                                    let artifact: Artifact = {drive_id: doc.id};
                                                    artifact = await drive.artifacts.load(artifact);

                                                    updated.push({...artifact, id: dbid()});
                                                }
                                            }

                                            setArtifacts(currentArtifacts => [...currentArtifacts, ...updated]);
                                        }
                                    }}
                                    viewId="DOCS"
                                    multiple
                                >
                                    <Cta invert icon={<MdCloudUpload/>}>
                                        Add files from Drive
                                    </Cta>
                                </Picker>
                                :
                                <>
                                    <Cta icon={<MdOpenInNew/>} href={collection.web_view || '#'} target="_blank" className="mx-2" invert>
                                        Open in drive
                                    </Cta>
                                    <Cta icon={<CgFeed/>} href={'/blog/' + session.user.id + '?tags=' + collection.id} className="mx-2" invert>
                                        Tagged posts
                                    </Cta>
                                </>
                            }
                        </div>
                    </div>
                    {error && <div className="w-full">
                        <Error error={error}/>
                    </div>}
                    <div className="flex flex-wrap justify-center w-full py-3 px-5 text-gray-600 mb-16">
                        {artifacts.map((artifact, i) => (
                            !artifact.awaiting_delete && (
                                <CollectionArtifact
                                    key={artifact.id}
                                    artifact={artifact}
                                    setArtifact={setArtifact(artifact.id)}
                                    removeArtifact={removeArtifact(artifact.id)}
                                    onClick={() => setEditing(true)}
                                    editing={showInputs && !saveDisabled}
                                />
                            )
                        ))}
                    </div>
                    {(props.creating || session && collection.author_id == session.user.id) &&
                        <div className="w-full py-4 fixed bottom-0 border border-top flex flex-row justify-center z-10 bg-white">
                            {showInputs ?
                                <>
                                    {validate(collection, artifacts) && <Cta
                                        onClick={() => save(window.gapi.client)}
                                        className="mx-2"
                                        icon={<MdDoneAll/>}
                                    >
                                        Save
                                    </Cta>}
                                    {saveDisabled || !validate(collection, artifacts) && <Cta
                                        className="bg-gray-200 text-gray-400 cursor-default"
                                        customBg
                                        customFont
                                        icon={<MdDoneAll/>}
                                    >
                                        Save
                                    </Cta>}
                                    {(!props.creating && !saveDisabled) && <Button
                                        onClick={() => {
                                            setEditing(false);
                                            setDbLoaded(false);
                                            setDriveLoaded(false);
                                        }}
                                        icon={<MdClose/>}
                                        className="border border-indigo-500 text-indigo-500 hover:text-white hover:bg-indigo-500 mx-2"
                                    >
                                        Cancel
                                    </Button>}
                                </>
                                :
                                <Button
                                    onClick={() => setEditing(true)}
                                    icon={<MdEdit/>}
                                    className="border border-indigo-500 text-indigo-500 hover:text-white hover:bg-indigo-500"
                                >
                                    Edit
                                </Button>
                            }
                        </div>
                    }
                </>
            }
        </Layout>
    );
}

// Forces page state to reset after [id] is changed (URL param changes are shallow by default)
export async function getServerSideProps(ctx){
    return {props: {key: Number(new Date())}};
}

interface ArtifactProps extends Interactive {
    artifact: Artifact
    setArtifact: (cb: StateSetter) => void
    removeArtifact: () => void
    editing?: boolean
}

function CollectionArtifact(props: ArtifactProps){
    const [pinned, setPinned] = useState(false);
    const artifact = props.artifact;

    return (
        <div key={artifact.id} className="m-4 w-80">
            <div className="rounded shadow">
                <div
                    className="transition-all rounded-t relative group"
                    style={{
                        backgroundImage: `url(https://lh3.google.com/u/1/d/1Q6P_uxijw2eGvHkcwmgKK5QGWgWKBUrSNzMFzbmWn7I=w250-h238-p-k-nu-iv29)`,
                        backgroundSize: 'cover',
                        minHeight: '200px'
                    }}
                >
                    {(props.editing || artifact.description != '') && <div
                        className={classNames(
                            'transition-all p-4 bg-white h-full w-full absolute text-gray-500 rounded-t',
                            props.editing || pinned ? 'opacity-100 bg-opacity-90' : 'opacity-0 bg-opacity-0 group-hover:bg-opacity-90 group-hover:opacity-100'
                        )}
                    >
                        <div className="flex flex-row items-start">
                            {props.editing ?
                                <>
                                    <Input
                                        type="textarea"
                                        placeholder="Enter artifact description"
                                        name="description"
                                        className="h-full flex-grow"
                                        value={artifact.description}
                                        setForm={props.setArtifact}
                                        customBg
                                        noPadding
                                    />
                                    <Button
                                        className="focus:text-gray-600"
                                        onClick={() => {
                                            if(artifact.shortcut_id){
                                                props.setArtifact(currentArtifact => ({...currentArtifact, awaiting_delete: true}));
                                            }else{
                                                props.removeArtifact();
                                            }
                                        }}
                                        customPadding
                                    >
                                        <MdClose/>
                                    </Button>
                                </>
                                :
                                <>
                                    <p onClick={props.onClick} className="flex-grow">{artifact.description}</p>
                                    <Button
                                        className={classNames(
                                            'text-lg',
                                            pinned ? 'text-gray-700' : 'text-gray-400'
                                        )}
                                        onClick={() => setPinned(currentPinned => !currentPinned)}
                                        customPadding
                                    >
                                        {pinned ? <MdStar/> : <MdStarBorder/>}
                                    </Button>
                                </>
                            }

                        </div>
                    </div>}
                </div>
                <div className="bg-gray-100 px-4 py-3 rounded-b text-gray-600 flex flex-row items-start shadow shadow-t-0">
                    <img src={artifact.icon} className="w-auto h-5 pr-3 pt-1"/>
                    <div ><a href={artifact.web_view} target="_blank">{artifact.title}</a></div>
                </div>
            </div>
        </div>
    );
}
