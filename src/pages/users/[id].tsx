import Layout from '../../lib/components/Layout';
import Error from '../../lib/components/Error';
import Input from '../../lib/components/Input';
import Tag from '../../lib/components/Tag';
import { Authorization } from '../../lib/authorization';
import db, { FileCollection } from '../../lib/db';
import { MdEdit, MdClose, MdCheck } from 'react-icons/md';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Profile(){
    const [session, loading] = useSession();

    const [user, setUser] = useState(null);
    const [collections, setCollections] = useState([] as FileCollection[]);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [files, setFiles] = useState([]);

    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    const router = useRouter();
    const { id } = router.query;

    async function getData(uid: string, userOnly?: boolean){
        if(uid){
            try {
                const doc = await db.users.doc(uid).get();

                if(doc.exists){
                    setUser(doc.data());
                    setError(null);

                    if(!userOnly){
                        const fileCollectionsRef = await db.file_collections.where('author_id', '==', uid).get();
                        const fileCollections = fileCollectionsRef.docs.map(doc => doc.data());
                        setCollections(fileCollections);
                    }

                    setDbLoaded(true);
                }else{
                    setError('Could not find user with id ' + id);
                    setUser(null);
                }
            }catch(_e){
                setError('There was an error loading this user');
            }
        }
    }

    async function getDriveData(client){
        try {
            const drive = await db.drive(client);
            const updated = await Promise.all(collections.map(async collection => {
                const [driveCollection] = await drive.file_collections.load([collection, []]);
                return driveCollection;
            }));

            setCollections(updated);
            setDriveLoaded(true);
        }catch(_e){
            setError('There was an error syncing with drive');
        }
    }

    useEffect(() => {
        if(!dbLoaded){
            getData(id as string);
        }

        if(dbLoaded && !driveLoaded && apisLoaded){
            getDriveData(window.gapi.client);
        }
    }, [id, dbLoaded, apisLoaded, driveLoaded]);

    return (
        <Layout
            authorization={Authorization.USER}
            gapis={[]}
            onGapisLoad={() => setApisLoaded(true)}
        >
            {error && <Error error={error}/>}
            {user && session &&
                <div className="flex flex-wrap justify-center w-screen rounded py-3 px-5 text-gray-600">
                    <div className="m-6 flex-column w-64">
                        {editing ?
                            <Input
                                type="file"
                                setFiles={setFiles}
                            >
                                <div className="relative">
                                    <img src={files.length > 0 ? files[0].preview.url : user.bio_pic} alt="profile" className="w-56 rounded mb-6 shadow-lg"/>
                                    <div className="absolute top-0 w-56 h-full bg-gray-600 opacity-50 rounded text-center"></div>
                                    <div className="absolute top-0 w-56 h-full rounded flex flex-column items-center justify-center">
                                        <MdEdit className="text-white" size="1.5em"/>
                                    </div>
                                </div>
                            </Input>
                            :
                            <img src={user.bio_pic} alt="profile" className="w-56 rounded mb-6 shadow-lg"/>
                        }
                        {files.length > 0 && editing &&
                            <div>
                                <hr/>
                                <div>
                                    <p
                                        className="text-gray-400 my-4"
                                        onClick={_e => setFiles([])}
                                    >
                                        <MdClose className="inline"/> {files[0].name}
                                    </p>
                                </div>
                            </div>
                        }
                        <div>
                            <h3 className="font-bold text-gray-700 text-lg my-2">Collections</h3>
                            <hr className="block"/>
                            <p className="my-1 flex flex-wrap">
                                {collections.length > 0 ?
                                    collections.map(collection => (
                                        <Tag href={'/collections/' + collection.id} className="mr-4 my-2">
                                            {collection.title}
                                        </Tag>
                                    ))
                                    :
                                    <span>No collections yet. {session.user.id == id && <Link href="/collections/new"><a className="text-blue-500 hover:underline">Add one</a></Link>}</span>
                                }
                            </p>
                        </div>
                    </div>
                    <div className="m-6 w-72">
                        {editing ?
                            <Input type="text" className="w-full text-xl font-bold" value={user.name} name="name" setForm={setUser}/>
                            :
                            <h3 className="text-xl font-bold text-gray-700">{user.name}</h3>
                        }
                        <hr className="my-3"/>
                        {editing ?
                            <Input className="w-full h-56" type="textarea" value={user.bio || ''} name="bio" setForm={setUser}/>
                            :
                            <p>{user.bio || <span className="text-gray-500">No bio yet</span>}</p>
                        }
                    </div>
                    <div className="ml-3 my-6 flex flex-col">
                        {session.user.id == id &&
                            <button className="rounded-full border border-gray-500 p-2 hover:bg-gray-500 hover:text-white focus:outline-none my-1 transition-colors" onClick={async () => {
                                if(editing) await getData(id, true);
                                setEditing(!editing);
                            }}>
                                {editing ? <MdClose/> : <MdEdit/>}
                            </button>
                        }

                        {editing &&
                            <button className="rounded-full border border-purple-400 text-purple-400 p-2 hover:bg-purple-400 hover:text-white focus:outline-none my-1 transition-colors" onClick={() => {
                                if(files.length > 0){
                                    const file = files[0];

                                    db.avatars(session.user.id + '.' + file.extension).put(file).then(async snapshot => {
                                        const url = await snapshot.ref.getDownloadURL();
                                        const oldURL = user.bio_pic;
                                        const update = {
                                            ...user,
                                            bio_pic: url
                                        };

                                        db.users.doc(session.user.id as string).set(update).then(_snapshot => {
                                            setUser(update);
                                            setFiles([]);
                                        });

                                        // Delete old file, if it was actually uploaded to the bucket
                                        db.avatars(oldURL).delete().catch(_e => {});
                                    });

                                    setUser({
                                        ...user,
                                        bio_pic: file.preview.url
                                    });
                                }else{
                                    setFiles([]);
                                    db.users.doc(session.user.id as string).set(user);
                                }

                                setEditing(false);
                            }}>
                                <MdCheck/>
                            </button>
                        }
                    </div>
                </div>
            }
        </Layout>
    );
}
