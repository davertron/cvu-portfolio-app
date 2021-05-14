import Nav from './Nav';
import { useAuth } from '../authorization';
import { Authorization } from '../../common-types';
import { useEffect } from 'react';
import { Session, useSession } from 'next-auth/client';
import { useRouter } from 'next/router';

interface LayoutProps {
    authorization?: Authorization,
    sessionState?: [Session, boolean]
}

export default function Layout(props: LayoutProps){

    const [session, loading] = props.sessionState || useSession();

    if(loading){
        return (
            <p>Loading...</p>
        );
    }else{
        const router = useRouter();
        const [success, redirect] = useAuth(props.authorization, session);

        if(!success){
            useEffect(() => {
                router.push(redirect);
            });
        }

        return (
            <>
                <Nav/>
                <div className="container px-7 py-6 font-light">{props.children}</div>
            </>
        );
    }
}
