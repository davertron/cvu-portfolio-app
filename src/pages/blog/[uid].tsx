import Layout from '../../lib/components/Layout';
import Input, { StateSetter } from '../../lib/components/Input';
import Button, { OutlineButton, Cta } from '../../lib/components/Button';
import Error from '../../lib/components/Error';
import Tag from '../../lib/components/Tag';
import { Authorization } from '../../lib/authorization';
import { dateString, classNames, createdAt } from '../../lib/util';
import db, { now, Post, FileCollection, User, Comment } from '../../lib/db';
import { useSession } from 'next-auth/client';
import { useEffect, useState } from 'react';
import { MdAdd, MdSearch, MdClose, MdDone, MdEdit, MdChatBubbleOutline, MdFavorite, MdFavoriteBorder, MdExpandLess, MdMoreHoriz } from 'react-icons/md';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface BlogProps {
    uid?: string;
    authorization?: Authorization;
}

export default function Blog(props: BlogProps){
    const [session, loading] = useSession();
    const router = useRouter();

    const [posts, setPosts] = useState([] as Post[]);
    const [collections, setCollections] = useState(new Map() as Map<string, FileCollection>);
    const [search, setSearch] = useState({term: ''});
    const [filters, setFilters] = useState([] as string[]);
    const [user, setUser] = useState(new User({}));

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
        return (cb: StateSetter<Post>) => {
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
            if(uid){
                const userSnapshot = await db.users.doc(uid as string).get();
                const dbUser = userSnapshot.data();

                const postsSnapshot = await db.posts.where('author_id', '==', uid).get();
                const dbPosts = postsSnapshot.docs.map(doc => doc.data());
                let dbComments = new Map();

                for(let post of dbPosts){
                    const commentsSnapshot = await db.comments(post.id).get();
                    dbComments[post.id] = commentsSnapshot.docs.map(doc => doc.data());
                }

                const collectionsSnapshot = await db.file_collections.where('author_id', '==', uid).get();
                let dbCollections = new Map();

                for(let collection of collectionsSnapshot.docs.map(doc => doc.data())){
                    dbCollections[collection.id] = collection;
                }

                setCollections(dbCollections);
                setPosts(dbPosts);
                setUser(dbUser);
                setDbLoaded(true);
            }
        }catch(_e){
            setError('There was an error loading posts');
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
            setError('There was an error syncing with Google Drive');
        }
    }

    useEffect(() => {
        if(!loading && !dbLoaded){
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
            authorization={props.authorization || Authorization.SHARED}
            author={user}
            authorLoaded={dbLoaded}
            gapis={[]}
            onGapisLoad={() => setApisLoaded(true)}
            noPadding
        >
            <div className="flex flex-col items-center bg-gradient-to-r from-blue-300 to-indigo-700 w-full py-10 text-white">
                <h1 className="font-bold text-3xl text-center my-4">{user.name && !owned ? user.name + "'s Blog" : 'Blog'}</h1>
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
                        className="bg-gray-100 bg-opacity-10 placeholder-gray-200 h-11 px-3 focus:bg-opacity-20"
                        name="term"
                        onInput={e => setSearch(currentSearch => ({
                            ...currentSearch,
                            term: e.target.value
                        }))}
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
                            onClick={() => setPosts(currentPosts => [
                                ...currentPosts,
                                new Post({
                                    author_id: session.user.id,
                                    awaiting_save: true
                                })
                            ])}
                            customPadding
                            customBg
                        >
                            <MdAdd size="2em"/>
                        </Cta>
                    }
                    {search.term.trim() == '' ?
                        [
                            ...posts.filter(p => p.awaiting_save).map(renderPost),
                            ...posts.filter(p => !p.awaiting_save).sort(createdAt).filter(matchFilters(filters)).map(renderPost)
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
    setPost: (cb: StateSetter<Post>) => void
    removePost: () => void
    collections: Map<string, FileCollection>
    validate: (post: Post) => boolean
    editing?: boolean
    locked?: boolean
}

function BlogPost(props: PostProps){
    const [session, loading] = useSession();

    const [comments, setComments] = useState([] as Comment[]);
    const [users, setUsers] = useState(new Map() as Map<string, User>);

    const [editing, setEditing] = useState(!props.locked && props.editing);
    const [editingId, setEditingId] = useState(null);
    const [expand, setExpand] = useState(false);
    const [dbLoaded, setDbLoaded] = useState(false);

    const post = props.post;
    const setComment = (cid: string) => {
        return (cb: StateSetter<Comment>) => {
            setComments(currentComments => currentComments.map(c => c.id == cid ? cb(c) : c));
        }
    }

    const validate = (comment: Comment) => comment.body && comment.body.trim() != '';

    async function getData(pid: string){
        const commentSnapshot = await db.comments(pid).get();
        const dbComments = commentSnapshot.docs.map(doc => doc.data());

        const dbUsers = new Map();

        for(let comment of dbComments){
            const doc = await db.users.doc(comment.author_id).get();

            if(doc.exists){
                const user = doc.data();

                dbUsers[user.id] = {
                    bio_pic: user.bio_pic,
                    name: user.name
                };
            }
        }

        setComments(dbComments);
        setUsers(dbUsers);
        setDbLoaded(true);
    }

    useEffect(() => {
        if(!dbLoaded && post){
            getData(post.id);
        }
    }, [post, dbLoaded]);

    return (
        <div
            key={post.id}
            className={classNames(
                'mb-8 py-3 px-7 self-stretch rounded-lg flex flex-col border',
                editing ? 'shadow border-gray-100' : 'border-gray-200'
            )}
        >
            <div className="my-3">
                {editing ?
                    <Input type="text" name="title" className="text-xl font-bold w-full text-gray-600" placeholder="Post title" setForm={props.setPost} value={post.title}/>
                    :
                    <div className="flex items-start">
                        <div className="flex-grow">
                            <h1 className="text-xl font-bold">{post.title}</h1>
                            <p className="text-gray-400 mt-2">{dateString(post.created_at)}</p>
                        </div>
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
                                            props.setPost(currentPost => currentPost.with({
                                                tags: [...currentPost.tags, cid]
                                            }));
                                        }else{
                                            props.setPost(currentPost => currentPost.with({
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
                <Cta
                    className="mr-4"
                    disabled={!props.validate(post)}
                    icon={<MdDone/>}
                    onClick={() => {
                        const created_at = now();

                        if(post.awaiting_save){
                            props.setPost(currentPost => currentPost.with({
                                awaiting_save: false,
                                created_at
                            }));
                        }

                        setEditing(false);

                        db.posts.doc(post.id).set(post);
                    }}
                >
                    Save
                </Cta>
                <OutlineButton
                    color="indigo-500"
                    icon={<MdClose/>}
                    onClick={async () => {
                        if(post.awaiting_save){
                            props.removePost();
                        }else{
                            const doc = await db.posts.doc(post.id).get();
                            db.posts
                            props.setPost(_currentPost => doc.data());
                        }

                        setEditing(false);
                    }}
                >
                    Cancel
                </OutlineButton>
            </div>}
            {!(editing || props.locked) &&
                <div className="flex flex-col mt-2">
                    <Button onClick={() => setExpand(!expand)} className="text-right text-lg mb-2" customPadding>
                        {expand ?
                            <MdExpandLess/>
                            :
                            <MdMoreHoriz/>
                        }
                    </Button>
                    {expand &&
                        <div className="flex mt-1 mb-3">
                            <OutlineButton
                                color="indigo-500"
                                className="mr-4"
                                onClick={() => {
                                    setEditing(true);
                                    setExpand(false);
                                }}
                                icon={<MdEdit/>}
                            >
                                Edit
                            </OutlineButton>
                            <OutlineButton
                                color="red-700"
                                onClick={() => {
                                    if(confirm(`Are you sure you want to delete post "${post.title}"?`)){
                                        db.posts.doc(post.id).delete();
                                        props.removePost();
                                    }
                                }}
                                icon={<MdClose/>}
                            >
                                Delete
                            </OutlineButton>
                        </div>
                    }
                </div>
            }
            {(comments.length > 0 || props.locked) && <div className="mt-3 mb-1">
                {comments.sort(createdAt).map(comment => {
                    const showInputs = (comment.awaiting_save || editingId == comment.id) && comment.author_id == session.user.id;
                    const author = users[comment.author_id] || {};

                    return (
                        <div className="flex py-3" key={comment.id}>
                            <div
                                className="rounded-full h-10 w-10 flex-shrink-0 bg-cover"
                                style={{backgroundImage: `url(${author.bio_pic})`}}
                            />
                            <div className="flex flex-col justify-center flex-grow ml-3 text-gray-500">
                                {showInputs ?
                                    <>
                                        <Input type="textarea" className="w-full mb-3" name="body" setForm={setComment(comment.id)} value={comment.body}/>
                                        <div className="flex">
                                            <Cta
                                                disabled={!validate(comment)}
                                                className="mr-3"
                                                icon={comment.awaiting_save ? <MdChatBubbleOutline/> : <MdDone/>}
                                                onClick={() => {
                                                    const created_at = now();

                                                    db.comments(post.id).doc(comment.id).set(comment.with({created_at}));

                                                    if(comment.awaiting_save){
                                                        setComment(comment.id)(currentComment => currentComment.with({
                                                            awaiting_save: false,
                                                            created_at
                                                        }));
                                                    }else{
                                                        setEditingId(null);
                                                    }
                                                }}
                                            >
                                                {comment.awaiting_save ? 'Add' : 'Save'}
                                            </Cta>
                                            <OutlineButton
                                                color="gray-500"
                                                icon={<MdClose/>}
                                                onClick={comment.awaiting_save ?
                                                    () => setComments(currentComments => currentComments.filter(
                                                        comment => !comment.awaiting_save
                                                    ))
                                                    :
                                                    () => setEditingId(null)
                                                }
                                            >
                                                Cancel
                                            </OutlineButton>
                                        </div>
                                    </>
                                    :
                                    <>
                                        <div className="flex flex-wrap justify-between flex-grow mb-1 w-full">
                                            <p className="font-bold">{author.name}</p>
                                            {comment.created_at && <p className="text-gray-400">{dateString(comment.created_at)}</p>}
                                        </div>
                                        <div className="flex justify-between w-full">
                                            <p>{comment.body}</p>
                                            {comment.author_id == session.user.id && <div className="flex items-start text-gray-400">
                                                <Button
                                                    className="mx-1"
                                                    onClick={() => setEditingId(comment.id)}
                                                    customPadding
                                                >
                                                    <MdEdit/>
                                                </Button>
                                                <Button
                                                    className="mx-1"
                                                    onClick={() => {
                                                        setComments(currentComments => currentComments.filter(c => c.id != comment.id));
                                                        db.comments(post.id).doc(comment.id).delete();
                                                    }}
                                                    customPadding
                                                >
                                                    <MdClose/>
                                                </Button>
                                            </div>}
                                        </div>
                                    </>
                                }
                            </div>
                        </div>
                    )
                })}
                {(post.likes.length > 0 || props.locked) &&<div className="flex justify-between mt-2 items-center">
                     {(props.locked && !comments.find(comment => comment.awaiting_save)) &&
                        <OutlineButton
                            color="indigo-500"
                            icon={<MdChatBubbleOutline/>}
                            onClick={() => {
                                if(session && !loading){
                                    setUsers(currentUsers => ({
                                        ...currentUsers,
                                        [session.user.id]: session.user
                                    }));

                                    setComments(currentComments => [
                                        new Post({
                                            author_id: session.user.id,
                                            awaiting_save: true
                                        }),
                                        ...currentComments
                                    ]);
                                }
                            }}
                        >
                            Add a comment
                        </OutlineButton>
                    }
                    <div className="flex flex-grow justify-end items-center">
                        <Button
                            className="text-xl text-red-500"
                            disabled={session.user.id == post.author_id}
                            onClick={async () => {
                                if(session){
                                    const updatedLikes = post.likes.indexOf(session.user.id) == -1 ?
                                        [...post.likes, session.user.id] : post.likes.filter(uid => uid != session.user.id);

                                    await db.posts.doc(post.id).set(post.with({
                                        likes: updatedLikes
                                    }));

                                    props.setPost(currentPost => currentPost.with({likes: updatedLikes}));
                                }
                            }}
                            icon={session && post.likes.indexOf(session.user.id) == -1 ? <MdFavoriteBorder/> : <MdFavorite/>}
                            customPadding
                            flexReverse
                        >
                            {post.likes.length > 0 && <div className="text-base">{post.likes.length}</div>}
                        </Button>
                    </div>
                </div>}
            </div>}
        </div>
    );
}
