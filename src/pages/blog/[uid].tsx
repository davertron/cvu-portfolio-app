import Layout from '../../lib/components/Layout';
import Input, { StateSetter } from '../../lib/components/Input';
import Button, { Cta } from '../../lib/components/Button';
import Error from '../../lib/components/Error';
import Tag from '../../lib/components/Tag';
import { Authorization } from '../../lib/authorization';
import { dateString, classNames, valueOf } from '../../lib/util';
import db, { id as dbid, now, Post, FileCollection } from '../../lib/db';
import { useSession } from 'next-auth/client';
import { useEffect, useState } from 'react';
import { MdAdd, MdSearch, MdClose, MdDone, MdEdit } from 'react-icons/md';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface BlogProps {
    uid?: boolean
}

export default function Blog(props: BlogProps){
    const [session, loading] = useSession();
    const router = useRouter();

    const [posts, setPosts] = useState([] as Post[]);
    const [collections, setCollections] = useState({} as Map<string, FileCollection>);
    const [search, setSearch] = useState({term: ''});
    const [filters, setFilters] = useState([] as string[]);

    const [error, setError] = useState(null);

    const [searchFocused, setSearchFocused] = useState(false);
    const [dbLoaded, setDbLoaded] = useState(false);
    const [driveLoaded, setDriveLoaded] = useState(false);
    const [apisLoaded, setApisLoaded] = useState(false);

    const queryFilters = router.query.tags as string;

    const uid = router.query.uid || props.uid;
    const owned = session && session.user.id == uid;

    const searchResults = rank(search.term)(posts);

    const removePost = (pid: string) => {
        return () => {
            setPosts(currentPosts => currentPosts.filter(post => post.id != pid));
        }
    }
    const setPost = (pid: string) => {
        return (cb: StateSetter) => {
            setPosts(currentPosts => currentPosts.map(post => post.id == pid ? cb(post) : post));
        }
    }

    function match(keywords: string[], word: string, scores: number[]){
        if(word && typeof word == 'string'){
            if(keywords.indexOf(word.trim()) != -1) return scores[0];
            else if(keywords.find(key => word.includes(key))) return scores[1];
        }

        return 0;
    }

    function relevance(keywords: string[]){
        return (post: Post) => {
            let score = 0;

            post.body.toLowerCase().split(' ').map(word => {
                score += match(keywords, word, [2,1]);
            });

            post.title.toLowerCase().split(' ').map(word => {
                score += match(keywords, word, [5, 1.5]);
            });

            post.tags.map(cid => {
                const collection = collections[cid];
                if(collection) score += match(keywords, collection.title, [4, 1.5])
            });

            return score;
        }
    }

    function rank(term: string){
        const getRelevance = relevance(term.toLowerCase().split(' '));

        return (toRank: Post[]) => {
            return toRank.sort((a,b) => getRelevance(b) - getRelevance(a)).filter(p => getRelevance(p) > 0);
        }
    }

    const intersect = (a: any[], b: any[]) => {
        for(let e of b){
            if(a.indexOf(e) == -1){
                return false;
            }
        }

        return true;
    }

    function matchFilters(searchFilters: string[]){
        return (post: Post) => intersect(post.tags, searchFilters);
    }

    const validate = (post: Post) => post.title.trim() != '';

    async function getData(){
        try {
            const postsSnapshot = await db.posts.where('author_id', '==', uid).get();
            const dbPosts = postsSnapshot.docs.map(doc => doc.data());

            const collectionsSnapshot = await db.file_collections.where('author_id', '==', uid).get();
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
            setError('There was an error loading your posts');
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

        if(queryFilters){
            setFilters(queryFilters.split(','));
        }
    }, [dbLoaded, driveLoaded, apisLoaded, loading, queryFilters]);

    const renderPost = (post: Post) => (
        <BlogPost
            key={post.id}
            post={post}
            removePost={removePost(post.id)}
            setPost={setPost(post.id)}
            collections={collections}
            validate={validate}
            editing={post.awaiting_save}
            locked={!owned}
        />
    );

    return (
        <Layout
            authorization={Authorization.USER}
            gapis={[]}
            onGapisLoad={() => setApisLoaded(true)}
            noPadding
        >
            <div className="flex flex-col items-center bg-gradient-to-r from-blue-300 to-indigo-700 w-full py-10 text-white">
                <h1 className="font-bold text-3xl text-center my-4">Blog</h1>
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
            <div className="flex items-start px-20 py-7 relative">
                <div className="flex-grow flex flex-col items-center px-10 sm:px-5">
                    {error && <div className="self-stretch mb-1">
                        <Error error={error}/>
                    </div>}
                    {(search.term.trim() == '' && filters.length == 0 && posts.filter(post => post.awaiting_save).length == 0 && owned) &&
                        <Cta
                            className="mb-10 text-center self-stretch flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-indigo-500 hover:text-white py-3"
                            onClick={() => {
                                const post = {
                                    id: dbid(),
                                    title: '',
                                    body: '',
                                    tags: [],
                                    author_id: session.user.id,
                                    awaiting_save: true
                                };

                                setPosts(currentPosts => [...currentPosts, post]);
                            }}
                            customPadding
                            customBg
                        >
                            <MdAdd size="2em"/>
                        </Cta>
                    }
                    {search.term.trim() == '' ?
                        [
                            ...posts.filter(p => p.awaiting_save).map(renderPost),
                            ...posts.filter(p => !p.awaiting_save).sort((a,b) => (
                                (a.created_at && b.created_at) ?  valueOf(b.created_at) - valueOf(a.created_at) : 0
                            )).filter(matchFilters(filters)).map(renderPost)
                        ]
                        :
                        searchResults.length > 0 ? searchResults.filter(matchFilters(filters)).map(renderPost) : <p className="text-gray-500">No posts matching "{search.term}"</p>
                    }
                </div>
                <div className="flex-none w-80 mx-10">
                    <h1 className="font-bold text-lg my-1">Tagged Collections</h1>
                    <hr className="mt-3 mb-4"/>
                    <div>
                        {Object.keys(collections).length > 0 ?
                            Object.keys(collections).map(cid => (
                                <Tag
                                    key={cid}
                                    className="my-4"
                                    onClick={selected => {
                                        if(selected){
                                            setFilters(currentFilters => [...currentFilters, cid]);
                                        }else{
                                            setFilters(currentFilters => currentFilters.filter(filter => filter != cid));
                                        }
                                    }}
                                    selected={filters.indexOf(cid) != -1}
                                    gradient
                                >
                                    {collections[cid].title}
                                </Tag>
                            ))
                            :
                            <p className="text-gray-500">
                                {owned ?
                                    <>No collections yet. <Link href="/collections/new"><a className="text-blue-500 hover:underline">Add one</a></Link></>
                                    :
                                    <>No collections tagged by this user</>

                                }
                            </p>
                        }
                    </div>
                </div>
            </div>
        </Layout>
    );
}

interface PostProps {
    post: Post
    setPost: (cb: StateSetter) => void
    removePost: () => void
    collections: Map<string, FileCollection>
    validate: (post: Post) => boolean
    editing?: boolean
    locked?: boolean
}

function BlogPost(props: PostProps){
    const [editing, setEditing] = useState(props.locked || !!props.editing);
    const post = props.post;

    return (
        <div
            key={post.id}
            className={classNames(
                'mb-8 py-3 px-7 self-stretch rounded-lg flex flex-col border',
                editing ? 'shadow border-gray-100' : 'border-gray-200'
            )}
        >
            <div className="my-3 text-xl">
                {editing ?
                    <Input type="text" name="title" className="font-bold w-full text-gray-600" placeholder="Post title" setForm={props.setPost} value={post.title}/>
                    :
                    <div className="flex items-start">
                        <div className="flex-grow">
                            <h1 className="font-bold">{post.title}</h1>
                            <p className="text-gray-400 text-base mt-2">{dateString(post.created_at)}</p>
                        </div>
                        {!props.locked &&
                            <>
                                <Button className="mx-2 text-gray-500" onClick={() => setEditing(true)} customPadding>
                                    <MdEdit size="0.9em"/>
                                </Button>
                                <Button
                                    className="mx-2 text-gray-500"
                                    onClick={() => {
                                        if(confirm(`Are you sure you want to delete post "${post.title}"?`)){
                                            db.posts.doc(post.id).delete();
                                            props.removePost();
                                        }
                                    }}
                                    customPadding
                                >
                                    <MdClose size="0.9em"/>
                                </Button>
                            </>
                        }
                    </div>
                }
            </div>
            <hr/>
            <div className="my-3 text-gray-500">
                {editing ?
                    <Input type="textarea" className="w-full h-40" name="body" setForm={props.setPost} value={post.body}/>
                    :
                    <p>{post.body}</p>
                }
            </div>
            {(post.tags.length > 0 || editing) &&
                <>
                    <h3 className="font-bold my-1 text-gray-700">{editing ? 'Tag collections' : 'Tagged collections'}</h3>
                    <div className="flex flex-wrap my-1">
                        {editing ?
                            Object.keys(props.collections).map(cid => (
                                <Tag
                                    key={post.id + cid}
                                    className="my-2 mr-4"
                                    onClick={selected => {
                                        if(selected){
                                            props.setPost((currentPost: Post) => ({
                                                ...currentPost,
                                                tags: [...currentPost.tags, cid]
                                            }));
                                        }else{
                                            props.setPost((currentPost: Post) => ({
                                                ...currentPost,
                                                tags: currentPost.tags.filter(tag => tag != cid)
                                            }));
                                        }
                                    }}
                                    selected={post.tags.indexOf(cid) != -1}
                                >
                                    {props.collections[cid].title}
                                </Tag>
                            ))
                            :
                            post.tags.map(cid => (
                                <Tag className="my-2 mr-4" href={'/collections/' + cid} key={post.id + cid} active>
                                    {props.collections[cid].title}
                                </Tag>
                            ))
                        }
                    </div>
                </>
            }
            {editing && <div className="mb-4 mt-6 flex">
                {props.validate(post) ?
                    <Cta
                        className="mr-4"
                        icon={<MdDone/>}
                        onClick={() => {
                            const created_at = now();

                            if(post.awaiting_save){
                                props.setPost((currentPost: Post) => ({
                                    ...currentPost,
                                    awaiting_save: false,
                                    created_at
                                }));
                            }

                            setEditing(false);

                            db.posts.doc(post.id).set({
                                title: post.title,
                                body: post.body,
                                author_id: post.author_id,
                                tags: post.tags,
                                created_at
                            });
                        }}
                    >
                        Save
                    </Cta>
                    :
                    <Cta className="bg-gray-200 text-gray-400 cursor-default mr-4" customBg customFont icon={<MdDone/>}>Save</Cta>
                }
                <Button
                    className="text-indigo-500 border border-indigo-500 hover:text-white hover:bg-indigo-500"
                    icon={<MdClose/>}
                    onClick={async () => {
                        if(post.awaiting_save){
                            props.removePost();
                        }else{
                            const doc = await db.posts.doc(post.id).get();
                            props.setPost(_currentPost => doc.data());
                        }

                        setEditing(false);
                    }}
                >
                    Cancel
                </Button>
            </div>}
        </div>
    );
}
