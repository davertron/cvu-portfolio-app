import Cta from '../lib/components/Cta';
import Layout from '../lib/components/Layout';
import { Authorization } from '../lib/authorization';
import { useSession, signIn } from 'next-auth/client';
import { CgGoogle } from 'react-icons/cg';

export default function Index(){
    const [session, loading] = useSession();

    return (
        <Layout>
            {session &&
                <h1 className="text-xl font-light text-gray-700">Welcome to MyPortfolio</h1>
            }
            {!loading && !session &&
                <Cta onClick={() => signIn('google')} gradient flex>
                    <div className="mr-3"><CgGoogle size="1.3em"/></div>
                    <div>Continue with Google</div>
                </Cta>
            }
        </Layout>
    )
}
