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
    const router = useRouter();
    let [success, redirect] = [true, ''];

    useEffect(() => {
        if(!success){
            router.push(redirect);
        }
    }, [success, redirect])

    if(loading){
        return (
            <p>Loading...</p>
        );
    }else{
        [success, redirect] = useAuth(props.authorization, session);

        return (
            <>
                <Nav session={session}/>
                <div className="container px-7 py-6 font-light">{props.children}</div>
            </>
        );
    }
}
