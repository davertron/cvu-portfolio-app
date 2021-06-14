import Layout from '../../lib/components/Layout';
import { Authorization } from '../../lib/authorization';

export default function Feed(){
    return (
        <Layout
            authorization={Authorization.USER}
        >
            <h1 className="w-full text-center text-3xl py-4">Feed</h1>
            <hr/>
        </Layout>
    );
}
