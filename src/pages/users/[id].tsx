import Layout from '../../lib/components/Layout';
import Error from '../../lib/components/Error';
import Input from '../../lib/components/Input';
import { Authorization } from '../../lib/authorization';
import db from '../../lib/db';
import { MdEdit, MdClose, MdCheck } from 'react-icons/md';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Profile(){
    const [session, loading] = useSession();

    const [user, setUser] = useState(null);
    const [collections, setCollections] = useState([]);
    const [error, setError] = useState(null);
    const [editing, setEditing] = useState(false);
    const [files, setFiles] = useState([]);

    const router = useRouter();
    const { id } = router.query;

    async function getData(userOnly?: boolean){
        if(id){
            let uid = id as string;
            const doc = await db.users.doc(uid).get();

            if(doc){
                setUser(doc.data());
                setError(null);

                if(!userOnly){
                    const fileCollectionsRef = await db.file_collections.where('author_id', '==', uid).get();
                    const fileCollections = fileCollectionsRef.docs.map(doc => doc.data());
                    setCollections(fileCollections);
                }
            }else{
                setError('Could not find user with id ' + id);
                setUser(null);
            }
        }
    }

    useEffect(() => {
        getData();
    }, [setUser, setError, id]);

    return (
        <Layout authorization={Authorization.USER}>
            {error && <Error error={error}/>}
            {user && session &&
                <div className="flex flex-wrap justify-center w-screen rounded py-3 px-5 text-gray-600">
                    <div className="m-6 flex-column">
                        {editing ?
                            <Input
                                type="file"
                                setFiles={setFiles}
                            >
                                <div className="relative">
                                    <img src={user.bio_pic} alt="profile" className="w-56 rounded mb-6 shadow-lg"/>
                                    <div className="absolute top-0 w-full h-full bg-gray-600 opacity-80 rounded text-center"></div>
                                    <div className="absolute top-0 w-full h-full rounded flex flex-column items-center justify-center">
                                        <MdEdit className="text-white" size="1.5em"/>
                                    </div>
                                </div>
                                {files.length > 0 &&
                                    <>
                                        <hr/>
                                        <div>
                                            {files.length}
                                            {files.map(file => (
                                            ))}
                                        </div>
                                    </>
                                }
                            </Input>
                            :
                            <img src={user.bio_pic} alt="profile" className="w-56 rounded mb-6 shadow-lg"/>
                        }
                        <div>
                            <h3 className="font-bold text-gray-700 text-lg my-2">Tags</h3>
                            <p className="my-3">
                                {collections.length > 0 ?
                                    collections.map(collection => {
                                        <span>{collection.name}</span>
                                    })
                                    :
                                    <span>No collections yet. <a href="/collection/new" className="text-blue-500 hover:underline">Add one</a></span>
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
                        <button className="rounded-full border border-gray-500 p-2 hover:bg-gray-500 hover:text-white focus:outline-none my-1 transition-colors" onClick={async () => {
                            if(editing) await getData(true);
                            setEditing(!editing);
                        }}>
                            {editing ? <MdClose/> : <MdEdit/>}
                        </button>
                        {editing &&
                            <button className="rounded-full border border-purple-400 text-purple-400 p-2 hover:bg-purple-400 hover:text-white focus:outline-none my-1 transition-colors" onClick={() => {
                                db.users.doc(id as string).set(user);
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
