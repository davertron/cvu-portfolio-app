import Nav from './Nav';
import { useAuth } from '../authorization';
import { Authorization } from '../../common-types';
import { useState, useEffect } from 'react';
import { Session, useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import NProgress from 'nprogress';

interface LayoutProps {
    authorization?: Authorization,
    sessionState?: [Session, boolean]
}

export default function Layout(props: LayoutProps){
    const [session, loading] = props.sessionState || useSession();
    const router = useRouter();

    useEffect(() => {
        const authState = useAuth(props.authorization, session);

        if(!authState.success && !loading){
            router.push(authState.redirect);
        }

        loading ? NProgress.start() : NProgress.done();
    });

    if(loading){
        // TODO: Add loading animation
        return (<></>);
    }else{
        return (
            <>
                <Nav sessionState={[session, loading]}/>
                <div className="container px-7 py-6 font-light">{props.children}</div>
            </>
        );
    }
}
