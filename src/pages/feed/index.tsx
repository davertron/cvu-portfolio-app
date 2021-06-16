import Layout from '../../lib/components/Layout';
import Input, { StateSetter } from '../../lib/components/Input';
import Button, { Cta } from '../../lib/components/Button';
import Error from '../../lib/components/Error';
import { Authorization } from '../../lib/authorization';
import { classNames } from '../../lib/util';
import db, { id as dbid, Post, FileCollection } from '../../lib/db';
import { useSession } from 'next-auth/client';
import { MdAdd, MdSearch, MdClose } from 'react-icons/md';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Feed(){
    const [session, loading] = useSession();

    const [posts, setPosts] = useState([]);
    const [collections, setCollections] = useState({} as Map<string, FileCollection>);
    const [search, setSearch] = useState({term: ''});

    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const [searchFocused, setSearchFocused] = useState(false);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    const searchResults = rank(search.term)(posts);

    const setPost = (cid: string) => {
        return (cb: StateSetter) => {
            setPosts(currentPosts => currentPosts.map(c => c.id == cid ? cb(c) : c));
        }
    }

    function match(keywords: string[], word: string, scores: number[]){
        if(keywords.indexOf(word) != -1) return scores[0];
        else if(keywords.find(key => word.includes(key))) return scores[1];
        else return 0;
    }

    function relevance(keywords: string[]){
        return (post: Post) => {
            let score = 0;

            post.body.split(' ').map(word => {
                score += match(keywords, word, [2,1]);
            });

            post.title.split(' ').map(word => {
                score += match(keywords, word, [5, 1.5]);
            });

            post.tags.map(cid => {
                const collection = collections[cid];
                if(collection) score += match(keywords, collection, [4, 1.5])
            });

            return score;
        }
    }

    function rank(term: string){
        const getRelevance = relevance(term.split(' '));

        return (toRank: Post[]) => {
            return toRank.sort((a,b) => getRelevance(a) - getRelevance(b)).filter(p => getRelevance(p) > 0);
        }
    }

    async function getData(){
        try {
            const postsSnapshot = await db.posts.where('author_id', '==', session.user.id).get();
            const dbPosts = postsSnapshot.docs.map(doc => doc.data());

            const collectionsSnapshot = await db.file_collections.where('author_id', '==', session.user.id).get();
            const dbCollections = collectionsSnapshot.docs.map(doc => doc.data());
            let collectionMap: Map<string, FileCollection> = new Map();

            for(let i = 0; i < dbCollections.length; i++){
                const collection = dbCollections[i];

                collectionMap[collection.id] = collection;
            }

            setCollections(collectionMap);
            setPosts(dbPosts);
            setDbLoaded(true);
        }catch(_e){
            setError('There was an error loading your feed');
        }
    }

    async function getDriveData(client){
        try {
            const drive = await db.drive(client);
            let collectionMap = collections;

            await Promise.all(
                Object.keys(collectionMap).map(async cid => {
                    const [driveCollection, _artifacts] = await drive.file_collections.load([
                        collectionMap[cid],
                        []
                    ]);

                    collectionMap[cid] = driveCollection;
                })
            );

            setCollections(collectionMap);
            setDriveLoaded(true);
        }catch(_e){
            setError('There was an error syncing with drive');
        }
    }

    useEffect(() => {
        if(!loading && session && !dbLoaded){
            getData();
        }

        if(dbLoaded && apisLoaded && !driveLoaded){
            getDriveData(window.gapi.client);
        }
    }, [dbLoaded, driveLoaded, apisLoaded, loading]);

    function renderPost(post: Post){
        const showInputs = editingId == post.id;

        return (
            <div key={post.id} className="mb-8 py-1 px-7 self-stretch shadow rounded">
                <div className="my-5 text-xl">
                    {showInputs ?
                        <Input type="text" name="title" className="font-bold w-full text-gray-600" placeholder="Post title" setForm={setPost(post.id)} value={post.title}/>
                        :
                        <h1 className="font-bold">{post.title}</h1>
                    }
                </div>
                {!showInputs && <hr/>}
                <div className="my-5 text-gray-500">
                    {showInputs ?
                        <Input type="textarea" className="w-full h-40"/>
                        :
                        <p></p>
                    }
                </div>
                <div className="my-5 flex flex-wrap">
                    {Object.keys(collections).map(cid => (
                        <Button
                            className="py-2 px-3 rounded-lg text-sm bg-gray-100 text-gray-500 flex items-center hover:text-white hover:bg-purple-600 focus-within:bg-red-500"
                            icon={<MdAdd size="1.2em"/>}
                            customPadding
                        >
                            {collections[cid].title}
                        </Button>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <Layout
            authorization={Authorization.USER}
            gapis={[]}
            onGapisLoad={() => setApisLoaded(true)}
            noPadding
        >
            <div className="flex flex-col items-center bg-gradient-to-r from-blue-300 to-indigo-700 w-full py-10 text-white">
                <h1 className="font-bold text-3xl text-center my-4">Feed</h1>
                <div className={classNames(
                    'flex items-center text-lg text-gray-100 my-4 rounded transition-all',
                    searchFocused && 'shadow-lg'
                )}>
                    <div
                        className={classNames(
                            'px-3 self-stretch rounded-l flex flex-col justify-center',
                            searchFocused ? 'bg-gradient-to-r from-purple-500 to-indigo-500 opacity-70' : 'bg-gray-50 bg-opacity-20'
                        )}
                        id="search-icon"
                    >
                        <div>
                            <MdSearch
                                size="1.3em"
                                className={classNames(
                                    'stroke-1',
                                    searchFocused ? 'text-white' : 'text-indigo-200'
                                )}
                            />
                        </div>
                    </div>
                    <Input
                        type="text"
                        id="search-input"
                        className="bg-gray-100 bg-opacity-10 placeholder-gray-300 h-11 px-3 focus:bg-opacity-20"
                        name="term"
                        setForm={setSearch}
                        value={search.term}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        placeholder="Search..."
                        customBg
                        customRounding
                        noPadding
                    />
                    <div
                        className={classNames(
                            'px-3 self-stretch rounded-r flex flex-col justify-center bg-gray-100',
                            searchFocused ? 'bg-opacity-20' : 'bg-opacity-10'
                        )}
                        id="search-icon"
                    >
                        <Button customPadding onClick={() => setSearch({term: ''})} className={classNames(search.term.trim() == '' && 'opacity-0')}>
                            <MdClose
                                size="1.3em"
                                className="text-indigo-200 hover:text-white"
                            />
                        </Button>
                    </div>
                </div>
            </div>
            <div className="flex px-20 py-7">
                <div className="flex flex-col items-center flex-grow mx-auto px-10 sm:px-5">
                    {error && <div className="self-stretch mb-1">
                        <Error error={error}/>
                    </div>}
                    {(search.term.trim() == '' && (posts.length > 0 ? !posts[0].awaiting_save : true)) &&
                        <Cta
                            className="mb-4 text-center self-stretch flex items-center justify-center bg-gray-200 text-gray-500 hover:bg-indigo-500 hover:text-white py-3"
                            onClick={() => {
                                const post = {
                                    id: dbid(),
                                    title: '',
                                    body: '',
                                    tags: [],
                                    awaiting_save: true
                                };

                                setEditingId(post.id);
                                setPosts(currentPosts => [...currentPosts, post]);
                            }}
                            customPadding
                            customBg
                        >
                            <MdAdd size="2em"/>
                        </Cta>
                    }
                    {search.term.trim() == '' ?
                        posts.reverse().map(renderPost)
                        :
                        searchResults.length > 0 ? searchResults.map(renderPost) : <p className="text-gray-500">No posts matching "{search.term}"</p>
                    }
                </div>
                <div className="px-10 w-1/3">
                    <h1 className="font-bold text-lg">Tags</h1>
                    <hr className="my-3"/>
                    {Object.keys(collections).length > 0 ?
                        Object.keys(collections).map(cid => <p>{collections[cid].title}</p>)
                        :
                        <p className="text-gray-500">No collections yet. <Link href="/collections/new"><a className="text-blue-500 hover:underline">Add one</a></Link></p>
                    }
                </div>
            </div>
        </Layout>
    );
}
