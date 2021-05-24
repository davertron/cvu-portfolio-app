import Cta from '../lib/components/Cta';
import Layout from '../lib/components/Layout';
import { Authorization } from '../lib/authorization';
import { signIn } from 'next-auth/client';
import { CgGoogle } from 'react-icons/cg';

export default function Index(){
    return (
        <Layout authorization={Authorization.GUEST}>
            <Cta onClick={() => signIn('google')} gradient flex>
                <div className="mr-3"><CgGoogle size="1.3em"/></div>
                <div>Continue with Google</div>
            </Cta>
        </Layout>
    )
}
