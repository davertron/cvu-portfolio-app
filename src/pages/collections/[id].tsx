import { Authorization } from '../../lib/authorization';
import Layout from '../../lib/components/Layout';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';

export default function Collection(){
    const [session, loading] = useSession();
    const router = useRouter();
    const { id } = router.query;

    return (
        <Layout authorization={Authorization.USER}>

        </Layout>
    );
}
