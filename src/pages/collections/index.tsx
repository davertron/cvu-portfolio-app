import { Authorization } from '../../lib/authorization';
import Layout from '../../lib/components/Layout';
import db, { FileCollection } from '../../lib/db';
import { useSession } from 'next-auth/client';
import { useState } from 'react';
import Link from 'next/link';

export default function Collection(){
    const [session, loading] = useSession();
    const [collections, setCollections] = useState([] as FileCollection[]);

    async function getData(){
        const collectionsRef = await db.file_collections.where('author_id', '==', session.user.id).get();
        const collections = collectionsRef.docs.map(doc => doc.data());
    }

    return (
        <Layout authorization={Authorization.USER}>
            {collections.length > 0 ?
                collections.map(() => <p></p>)
                :
                <p className="text-center py-10 text-lg">You don't have any collecions yet. <Link href="/collections/new"><a className="text-blue-500 hover:underline">Add one</a></Link></p>
            }
        </Layout>
    );
}
