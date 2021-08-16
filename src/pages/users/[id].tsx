import Layout from '../../lib/components/Layout';
import Error from '../../lib/components/Error';
import Input, { StateSetter } from '../../lib/components/Input';
import Tag from '../../lib/components/Tag';
import Custom404 from '../404';
import Button, { OutlineButton, Cta } from '../../lib/components/Button';
import { Authorization } from '../../lib/authorization';
import db from '../../lib/db/client';
import { User, FileCollection, Permission } from '../../lib/db/models';
import { loadStarted, warnIfUnsaved, cleanupWarnIfUnsaved } from '../../lib/util';
import { MdEdit, MdClose, MdCheck, MdPersonAdd, MdAdd } from 'react-icons/md';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import NProgress from 'nprogress';

export default function Profile(){
    const [session, loading] = useSession();

    const [user, setUser] = useState(new User({}));
    const [collections, setCollections] = useState([] as FileCollection[]);
    const [error, setError] = useState(null);

    const setPermission = (email: string) => ((cb: StateSetter) => {
        setUser(currentUser => currentUser.with({
            shared_with: currentUser.shared_with?.map?.(p => p.email == email ? cb(p) : p)
        }));
    });

    const [toShareWith, setToShareWith] = useState('');
    const [sharingError, setSharingError] = useState(null);
    const [sharedWith, setSharedWith] = useState(new Map<string, User>());
    const [files, setFiles] = useState([]);

    const [saveDisabled, setSaveDisabled] = useState(false);
    const [editing, setEditing] = useState(false);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    const router = useRouter();
    const { id } = router.query;

    const visibleSharedWith = user?.shared_with ? user.shared_with.filter(permission => !permission.awaiting_delete) : [];

    const validate = (email: string) => {
        const parts = email.split('@');

        if(parts.length == 2){
            const [address, domain] = parts;
            return address != '' && domain == 'cvsdvt.org' && sharingError == null && user?.shared_with?.filter(p => !p.awaiting_delete && p.email == email).length == 0;
        }

        return false;
    }

    function placeButtons(){
        try {
            const buttons = document.getElementById('sticky-buttons');
            const relativeClasses = ['border'];
            const fixedClasses = ['shadow-lg', 'flex-col'];

            if(buttons){
                if(window.scrollY > buttons.offsetTop + 10){
                    buttons.style.position = 'fixed';
                    buttons.classList.remove(...relativeClasses);
                    buttons.classList.add(...fixedClasses);
                }else{
                    buttons.style.position = 'relative';
                    buttons.classList.remove(...fixedClasses);
                    buttons.classList.add(...relativeClasses)
                }
            }
        }catch(_e){ }
    }

    function stickyButtons(){
        placeButtons();
        document.addEventListener('scroll', placeButtons);
    }

    async function share(){
        try {
            const snapshot = await db.users.where('email', '==', toShareWith).get();

            if(snapshot.empty){
                setSharingError('No user exists with email ' + toShareWith);
            }else{
                const docs = snapshot.docs.map(doc => doc.data());
                const user = docs[0];

                setUser(currentUser => currentUser.with({
                    shared_with: [
                        ...currentUser.shared_with,
                        new Permission({email: user.email})
                    ]
                }));

                setSharedWith(currentSharedWith => ({
                    ...currentSharedWith,
                    [toShareWith]: user
                }));

                setToShareWith('');
                setSharingError(null);
            }
        }catch(_e){
            setError('There was an error sharing your profile');
        }
    }

    async function save(){
        try {
            const updated = user;

            setSaveDisabled(true);
            NProgress.start();

            const drive = await db.drive(window.gapi.client);

            let driveSharedWith = await Promise.all(user.shared_with.map(async permission => {
                for(let collection of collections){
                    const artifactSnapshot = await db.artifacts(collection.id).get();
                    const artifacts = artifactSnapshot.docs.map(doc => doc.data());

                    permission = await drive.file_collections.set_access([collection, artifacts], permission);
                }

                return permission;
            }));

            driveSharedWith = driveSharedWith.filter(permission => !permission.awaiting_delete);
            updated.concat({shared_with: driveSharedWith});

            if(files.length > 0){
                const file = files[0];
                const filename = session.user.id + '.' + file.extension;

                await db.avatars(filename).put(file).then(async snapshot => {
                    const oldPic = user.bio_pic;
                    const url = await snapshot.ref.getDownloadURL();

                    updated.concat({
                        bio_pic: {
                            name: filename,
                            url
                        }
                    });

                    db.users.doc(session.user.id as string).set(updated).then(_snapshot => {
                        setUser(updated);
                        setFiles([]);
                    });

                    if(oldPic.name){
                        // Delete old file, if it was actually uploaded to the bucket
                        const oldRef = db.avatars(oldPic.name);

                        if(oldRef){
                            oldRef.delete().catch(e => {});
                        }
                    }
                });

                setUser(currentUser => currentUser.with({
                    bio_pic: {url: file.preview.url, name: ''},
                    shared_with: driveSharedWith
                }));
            }else{
                setFiles([]);

                await db.users.doc(session.user.id as string).set(updated);
                setUser(updated);
            }

            NProgress.done();
            setSaveDisabled(false);
            setEditing(false);
        }catch(e){
            setError('There was an error saving your profile');
        }finally{
            NProgress.done();
            setSaveDisabled(false);
        }
    }

    async function getData(uid: string, userOnly?: boolean){
        if(uid){
            try {
                setDbLoaded(null);
                const doc = await db.users.doc(uid).get();

                if(doc.exists){
                    const dbUser = doc.data();

                    setUser(dbUser);
                    setError(null);

                    if(!userOnly){
                        const snapshot = await db.file_collections.where('author_id', '==', uid).get();
                        const dbCollections = snapshot.docs.map(doc => doc.data());
                        setCollections(dbCollections);
                    }

                    const dbSharedWith: Map<string, User> = new Map();

                    for(let permission of dbUser.shared_with){
                        const snapshot = await db.users.where('email', '==', permission.email).get();

                        if(!snapshot.empty){
                            const docs = snapshot.docs.map(doc => doc.data());
                            dbSharedWith[permission.email] = docs[0];
                        }
                    }

                    setSharedWith(dbSharedWith);
                }else{
                    setError('Could not find user with id ' + id);
                    setUser(null);
                }
            }catch(e){
                setError('There was an error loading this user');
            }finally {
                setDbLoaded(true);
            }
        }
    }

    async function getDriveData(client){
        try {
            setDriveLoaded(null);

            const drive = await db.drive(client);
            const updated = await Promise.all(collections.map(async collection => {
                const [driveCollection] = await drive.file_collections.load([collection, []]);
                return driveCollection;
            }));

            setCollections(updated);
            setDriveLoaded(true);
        }catch(e){
            setError('There was an error syncing with drive');
        }
    }

    useEffect(() => {
        if(!loadStarted(dbLoaded)){
            getData(id as string, dbLoaded == null);
        }

        if(dbLoaded && !loadStarted(driveLoaded) && apisLoaded){
            getDriveData(window.gapi.client);
        }

        warnIfUnsaved(editing || saveDisabled);

        stickyButtons();

        return cleanupWarnIfUnsaved;
    }, [id, dbLoaded, apisLoaded, driveLoaded, editing, saveDisabled]);

    if(dbLoaded && user == null){
        return <Custom404 message={'User not found'}/>;
    }else{
        return (
            <Layout
                authorization={Authorization.SHARED}
                author={user}
                authorLoaded={dbLoaded}
                gapis={[]}
                onGapisLoad={() => setApisLoaded(true)}
            >
                {error && <Error error={error}/>}
                {user && session &&
                    <div>
                        {session.user?.id == id &&
                            <div className="rounded-lg p-2 border border-gray-300 flex justify-center top-0 bg-white z-10 transition-all" id="sticky-buttons">
                                {editing &&
                                    <Cta
                                        disabled={saveDisabled}
                                        icon={<MdCheck/>}
                                        className="m-2 font-bold"
                                        onClick={save}
                                    >
                                        Save
                                    </Cta>
                                }
                                {!saveDisabled &&
                                    <OutlineButton
                                        color="indigo-500"
                                        icon={editing ? <MdClose/> : <MdEdit/>}
                                        className="m-2"
                                        onClick={async () => {
                                            // Setting dbLoaded to null reloads page data with userOnly=true
                                            if(editing) setDbLoaded(null);
                                            setEditing(!editing);
                                        }}
                                    >
                                        {editing ? 'Cancel' : 'Edit'}
                                    </OutlineButton>
                                }
                        </div>}
                        <div className="flex flex-wrap-reverse justify-center w-screen rounded py-3 px-5 text-gray-600 relative">
                            <div className="m-8 flex-column w-80">
                                {editing ?
                                    <>
                                        <Input
                                            type="file"
                                            setFiles={setFiles}
                                        >
                                            <div className="relative">
                                                <img src={files?.length > 0 ? files[0].preview?.url : user.bio_pic?.url} alt="Bio pic" className="w-full rounded mb-6 shadow-lg"/>
                                                <div className="absolute top-0 w-full h-full bg-gray-600 opacity-50 rounded text-center"></div>
                                                <div className="absolute top-0 w-full h-full rounded flex flex-column items-center justify-center">
                                                    <MdEdit className="text-white" size="1.5em"/>
                                                </div>
                                            </div>
                                        </Input>
                                    </>
                                    :
                                    <img src={user.bio_pic?.url} alt="profile" className="w-full rounded mb-6 shadow-lg"/>
                                }
                                {files?.length > 0 && editing &&
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
                                    <h3 className="font-bold text-gray-600 text-lg my-2">Collections</h3>
                                    <hr className="block"/>
                                    <div className="my-2 flex flex-wrap">
                                        {collections?.length > 0 ?
                                            collections.map(collection => (
                                                <Tag href={'/collections/' + collection.id} key={collection.id} className="mr-4 my-2">
                                                    {collection.title}
                                                </Tag>
                                            ))
                                            :
                                            <span>No collections yet. {session.user?.id == id && <Link href="/collections/new"><a className="text-blue-500 hover:underline">Add one</a></Link>}</span>
                                        }
                                    </div>
                                </div>
                                {session.user?.id == id && <div>
                                    <h3 className="font-bold text-gray-600 text-lg mb-2 mt-4">Sharing</h3>
                                    <hr/>
                                    <div className="my-1">
                                        {visibleSharedWith?.length > 0 &&
                                            <>
                                                <p className="text-gray-500 pt-3">Users who can see your portfolio</p>
                                                <div className="py-1">
                                                    {visibleSharedWith.map(permission => sharedWith[permission.email] && (
                                                        <div className="my-3 bg-gray-50 rounded px-2 py-2 flex" key={permission.email}>
                                                            <div className="mr-3 p-1 pr-3 border-r border-gray-200">
                                                                <div
                                                                    className="rounded-full h-10 w-10 bg-cover flex-shrink-0"
                                                                    style={{backgroundImage: `url(${sharedWith[permission.email].image})`}}
                                                                />
                                                            </div>
                                                            <div className="mr-3 flex-grow">
                                                                <h4 className="font-bold">{sharedWith[permission.email].name}</h4>
                                                                <p>{permission.email}</p>
                                                            </div>
                                                            {editing && <div>
                                                                <Button
                                                                    onClick={() => {
                                                                        setPermission(permission.email)(currentPermission => ({
                                                                            ...currentPermission,
                                                                            awaiting_delete: true
                                                                        }));
                                                                    }}
                                                                    className="text-gray-400 focus:text-gray-700"
                                                                    customPadding
                                                                >
                                                                    <MdClose/>
                                                                </Button>
                                                            </div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        }
                                        {editing ?
                                            <div className="my-3">
                                                {sharingError && <Error error={sharingError}/>}
                                                <div className="flex w-full rounded bg-gray-100">
                                                    <Input
                                                        type="text"
                                                        placeholder="Enter email"
                                                        className="flex-grow bg-transparent"
                                                        value={toShareWith}
                                                        onInput={e => {
                                                            setToShareWith(e.target.value);

                                                            if(sharingError){
                                                                setSharingError(null);
                                                            }
                                                        }}
                                                        customBg
                                                    />
                                                </div>
                                                <Cta
                                                    disabled={!validate(toShareWith)}
                                                    className="w-full my-2 font-bold"
                                                    onClick={share}
                                                    icon={<MdAdd/>}
                                                >
                                                    Add
                                                </Cta>
                                            </div>
                                            :
                                            <Cta
                                                icon={<MdPersonAdd/>}
                                                onClick={() => setEditing(true)}
                                                className="w-full my-3"
                                                gradient={user?.shared_with && user?.shared_with?.length == 0}
                                            >
                                                {user?.shared_with && user?.shared_with?.length > 0 ? 'Add viewers' : 'Share your portfolio'}
                                            </Cta>
                                        }
                                    </div>
                                </div>}
                            </div>
                            <div className="m-8 w-72">
                                {editing ?
                                    <Input type="text" className="w-full text-xl font-bold" value={user?.name} name="name" setForm={setUser}/>
                                    :
                                    <h3 className="text-xl font-bold text-gray-700">{user?.name}</h3>
                                }
                                <hr className="my-3"/>
                                {editing ?
                                    <Input className="w-full h-56" type="textarea" value={user?.bio || ''} name="bio" setForm={setUser}/>
                                    :
                                    <p>{user?.bio || <span className="text-gray-500">No bio yet</span>}</p>
                                }
                            </div>
                        </div>
                    </div>
                }
            </Layout>
        );
    }
}
