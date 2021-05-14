import Layout from '../../lib/client/components/Layout';
import Cta from '../../lib/client/components/Cta';
import { Authorization } from '../../lib/common-types';
import { useSession, signOut } from 'next-auth/client';

export default function Profile(){
    const [session, loading] = useSession();

    return (
        <Layout authorization={Authorization.USER} session={session}>
            {session &&
                <>
                    <p className="font-light">Currently signed in as {session.user.email}</p>
                    <Cta onClick={() => signOut()} className="my-4">Sign Out</Cta>
                </>
            }
        </Layout>
    );
}
