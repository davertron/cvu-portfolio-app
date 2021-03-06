import { Cta } from '../lib/components/Button';
import Layout from '../lib/components/Layout';
import { useSession, signIn } from 'next-auth/client';
import { CgGoogle } from 'react-icons/cg';
import Image from 'next/image';

// Uncomment this for down for maintenance behavior
// export async function getServerSideProps() {
//     return {
//         redirect: {
//             permanent: false,
//             destination: 'https://down-for-maintenance-ashen.vercel.app/',
//         }
//     }
// }

export default function Index() {
    const [session, loading] = useSession();

    return (
        <Layout noPadding>
            <div className="text-center bg-gray-100 py-32">
                <div className="py-3">
                    <Image src="/img/logo.png" alt="Logo" width={100} height={100} />
                </div>
                <h1 className="text-3xl text-gray-700 mb-10 mt-3">
                    <span className="font-bold">Upgrade</span> your learning with MyPortfolio
                </h1>
                {!loading && !session && (
                    <Cta
                        onClick={() => signIn('google', { redirect: false })}
                        icon={<CgGoogle size="1.1em" />}
                        className="text-lg"
                        gradient
                    >
                        Continue with Google
                    </Cta>
                )}
            </div>
        </Layout>
    );
}
