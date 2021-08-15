import Layout from '../lib/components/Layout';
import Button, { ButtonProps, Cta, OutlineButton } from '../lib/components/Button';
import Error from '../lib/components/Error';
import db from '../lib/db/client';
import { User, FileCollection } from '../lib/db/models';
import { Authorization } from '../lib/authorization';
import { classNames } from '../lib/util';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/client';
import { MdOpenInNew, MdPeople, MdPermMedia, MdPersonOutline } from 'react-icons/md';
import { CgFeed } from 'react-icons/cg';

export default function Shared(){
    const [session, loading] = useSession();

    const [error, setError] = useState(null);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    const [showProfiles, setShowProfiles] = useState(true);

    const [collections, setCollections] = useState([] as FileCollection[]);
    const [users, setUsers] = useState(new Map() as Map<string, User>);

    async function getData(){
        try {
            const userSnapshot = await db.users.where('shared_with_email', 'array-contains', session.user.email).get();
            let dbUsers = new Map();
            let dbCollections = [];

            for(let user of userSnapshot.docs.map(doc => doc.data())){
                dbUsers[user.id] = user;

                const collectionsSnapshot = await db.file_collections.where('author_id', '==', user.id).get();
                dbCollections = [...dbCollections, ...collectionsSnapshot.docs.map(doc => doc.data())];
            }

            setUsers(dbUsers);
            setCollections(dbCollections);
            setDbLoaded(true);
        }catch(_e){
            setError('There was an error loading shared profiles')
        }
    }

    async function getDriveData(client){
        try {
            const drive = await db.drive(client);

            const driveCollections = await Promise.all(collections.map(async collection => {
                const [driveCollection, _driveArtifacts] = await drive.file_collections.load([collection, []]);
                return driveCollection;
            }));

            setCollections(driveCollections);
            setDriveLoaded(true);
        }catch(_e){
            setError('There was an error syncing with drive');
        }
    }

    useEffect(() => {
        if(session && !loading && !dbLoaded){
            getData();
        }

        if(dbLoaded && !driveLoaded && apisLoaded){
            getDriveData(window.gapi.client);
        }
    }, [loading, driveLoaded, dbLoaded, apisLoaded]);

    return (
        <Layout
            authorization={Authorization.USER}
            gapis={[]}
            onGapisLoad={() => setApisLoaded(true)}
            noPadding
        >
            <div className="flex flex-col items-center bg-gradient-to-r from-indigo-500 to-purple-500 w-full py-3 text-white">
                <h1 className="mb-4 mt-5 font-bold text-3xl">Shared with you</h1>
                <div className="mx-auto my-3 p-1 rounded bg-gray-100 bg-opacity-10 flex">
                    <SwitchButton
                        active={showProfiles}
                        icon={<MdPeople/>}
                        onClick={() => setShowProfiles(true)}
                    >
                        Profiles
                    </SwitchButton>
                    <SwitchButton
                        active={!showProfiles}
                        icon={<MdPermMedia/>}
                        onClick={() => setShowProfiles(false)}
                    >
                        Collections
                    </SwitchButton>
                </div>
            </div>
            {error && <Error error={error}/>}
            <div className="flex flex-wrap justify-center px-5 py-3">
                {showProfiles ?
                    Object.keys(users).length > 0 ?
                        Object.keys(users).map(uid => (
                            <div key={uid}>
                                <div className="m-4 bg-gray-100 shadow rounded bg-cover backdrop-blur" style={{backgroundImage: `url(${users[uid]?.bio_pic?.url})`}}>
                                    <div className="bg-indigo-700 bg-opacity-80 rounded-md text-white py-3 px-5">
                                        <div className="pt-1 pb-3 font-bold text-lg flex items-center">
                                            <img src={users[uid]?.image} className="flex-shrink-0 h-7 w-7 mr-3 rounded-full"/>
                                            <p>{users[uid]?.name}</p>
                                        </div>
                                        <p className="py-1">{users[uid]?.role?.toTitleCase?.()}</p>
                                        <div className="py-2 flex text-sm justify-between">
                                            <Cta
                                                icon={<MdPersonOutline/>}
                                                href={'/users/' + uid}
                                                customFont
                                                invert
                                            >
                                                Profile
                                            </Cta>
                                            <OutlineButton
                                                color="indigo-400"
                                                icon={<CgFeed/>}
                                                href={'/blog/' + uid}
                                                invert
                                            >
                                                Blog
                                            </OutlineButton>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                        :
                        <p className="text-gray-500 py-3">No profiles have been shared with you</p>
                    :
                    collections?.length > 0 ?
                        collections.map(collection => (
                            <div key={collection.id}>
                                <div className="m-4 bg-indigo-100 shadow rounded w-56">
                                    <div className="text-gray-600 px-4 pt-1 pb-2">
                                        <div className="flex items-start">
                                            <p className="text-lg font-bold my-2 h-full flex-grow">
                                                {collection.title}
                                            </p>
                                        </div>
                                        <p>{users[collection.author_id].name}</p>
                                    </div>
                                    <Button
                                        icon={<MdOpenInNew/>}
                                        className="bg-indigo-300 rounded-b w-full hover:text-white hover:bg-indigo-500"
                                        href={'/collections/' + collection.id}
                                        customRounding
                                    >
                                        View
                                    </Button>
                                </div>
                            </div>
                        ))
                        :
                        <p className="text-gray-500 py-3">No collections have been shared with you</p>
                }
            </div>
        </Layout>
    )
}

interface SwitchProps extends ButtonProps {
    active?: boolean;
}

function SwitchButton(props: SwitchProps){
    return (
        <Button
            {...props}
            className={classNames(
                'mx-2 my-1 py-2 px-4',
                props.active ? 'text-indigo-500 bg-white shadow' : 'hover:bg-white hover:bg-opacity-20'
            )}
            customPadding
        >
            {props.children}
        </Button>
    )
}
