import Nav from './Nav';
import { useAuth, Authorization } from '../authorization';
import { Props, Parent } from './types';
import { useEffect } from 'react';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import NProgress from 'nprogress';
import Head from 'next/head';

interface LayoutProps extends Props, Parent {
    authorization?: Authorization,
    title?: string
}

export default function Layout(props: LayoutProps){
    const [session, loading] = useSession();
    const router = useRouter();

    useEffect(() => {
        const authState = useAuth(props.authorization, session);

        if(!authState.success && !loading){
            router.push(authState.redirect);
        }

        loading ? NProgress.start() : NProgress.done();
    });

    if(loading){
        return (<></>);
    }else{
        return (
            <>
                <Head>
                    <title>{props.title || 'MyPortfolio'}</title>
                </Head>
                <Nav/>
                <div className="px-7 py-6 font-light">{props.children}</div>
            </>
        );
    }
}
