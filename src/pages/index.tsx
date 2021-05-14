import Cta from '../lib/client/components/Cta';
import Layout from '../lib/client/components/Layout';
import { Authorization } from '../lib/common-types';
import { useSession, signIn, signOut } from 'next-auth/client';
import { CgGoogle } from 'react-icons/cg';

export default function Index(){
    return (
        <Layout authorization={Authorization.GUEST}>
            <Cta onClick={() => signIn('google')} gradient={true}>
                <CgGoogle size="1.3em" className="inline mr-3 align-text-middle"/>
                <span className="align-middle">Continue with Google</span>
            </Cta>
        </Layout>
    )
}
