import Layout from '../../lib/client/components/Layout';
import Cta from '../../lib/client/components/Cta';
import Error from '../../lib/client/components/Error';
import { Authorization } from '../../lib/common-types';
import { useSession, signOut } from 'next-auth/client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Profile(){
    const [session, loading] = useSession();
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const router = useRouter();
    const { id } = router.query;

    async function getData(){
        if(id){
            const res = await fetch('/api/users/' + id);
            const data = await res.json();

            if(data.user){
                setUser(data.user);
                setError(null);
            }else{
                setError(data.error);
                setUser(null);
            }
        }
    }

    useEffect(() => {
        getData();
    }, [setUser, setError, id]);

    return (
        <Layout authorization={Authorization.USER} sessionState={[session, loading]}>
            {error && <Error error={error}/>}
            {user &&
                <div className="flex">
                    <div className="m-2 flex-column">
                        <img src={user.bio_pic} alt="profile" className="w-56 rounded"/>
                        <div>
                            <p>Tags</p>
                        </div>
                    </div>
                    <div className="m-2">{user.bio || 'Add bio'}</div>
                </div>
            }
        </Layout>
    );
}
