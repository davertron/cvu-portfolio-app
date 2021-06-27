/**
 * Layout Component
 * Wraparound component for consistent formatting
 */

import Nav from './Nav';
import { useAuth, Authorization } from '../authorization';
import { User } from '../db';
import { Props, Parent } from './types';
import { classNames } from '../util';
import { useEffect } from 'react';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import loadScript from 'load-script';
import NProgress from 'nprogress'; //progress bar
import Head from 'next/head';

interface LayoutProps extends Props, Parent {
    authorization?: Authorization
    author?: User
    title?: string
    className?: string
    noPadding?: boolean
    gapis?: string[]
    onGapisLoad?: () => void
}

const developerKey = process.env.NEXT_PUBLIC_API_KEY;
const clientId = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID;

export default function Layout(props: LayoutProps){
    const [session, loading] = useSession();
    const router = useRouter();

    useEffect(() => {
        if(!loading && (props.authorization != Authorization.SHARED || (props.author && props.author.shared_with))){
            const authState = useAuth(props.authorization, session, props.author);

            if(!authState.success){
                router.push(authState.redirect);
            }

            if(props.gapis && session){
                if(window.google){
                    if(props.onGapisLoad) props.onGapisLoad();
                }else{
                    loadScript('https://apis.google.com/js/api.js', () => {
                        for(let gapi of props.gapis){
                            window.gapi.load(gapi);
                        }

                        window.gapi.load('client:auth2', () => {
                            window.gapi.client.init({
                                apiKey: developerKey,
                                clientId: clientId,
                                scope: 'https://www.googleapis.com/auth/drive'
                            }).then(() => {
                                window.gapi.client.load('drive', 'v3', () => {
                                    if(props.onGapisLoad) props.onGapisLoad();
                                });
                            });
                        });
                    });
                }
            }
        }

        //set progress bar state
        loading ? NProgress.start() : NProgress.done();
    }, [loading, props.author]);

    if(loading){
        return (<></>);
    }else{
        return (
            <>
                <Head>
                    <title>{props.title || 'MyPortfolio'}</title>
                </Head>
                <Nav/>
                <div
                    className={classNames(
                        'font-light',
                        !props.noPadding && 'px-7 py-6',
                        props.className
                    )}
                >
                    {props.children}
                </div>
            </>
        );
    }
}
