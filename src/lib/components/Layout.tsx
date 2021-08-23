/**
 * Layout Component
 * Wraparound component for consistent formatting
 */

import Nav from './Nav';
import ErrorBoundary from './ErrorBoundary';
import { useAuth, Authorization } from '../authorization';
import { User } from '../db/models';
import db from '../db/client';
import { Props, Parent } from './types';
import { classNames } from '../util';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import loadScript from 'load-script';
import NProgress from 'nprogress'; //progress bar
import Head from 'next/head';

interface LayoutProps extends Props, Parent {
    authorization?: Authorization;
    author?: User;
    authorLoaded?: boolean;
    title?: string;
    className?: string;
    noPadding?: boolean;
    gapis?: string[];
    onGapisLoad?: () => void;
}

const apiKey = process.env.NEXT_PUBLIC_API_KEY;
const clientId = process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID;

export default function Layout(props: LayoutProps) {
    const [session, loading] = useSession();
    const [initialized, setInitialized] = useState(false);
    const router = useRouter();

    function apiLoader(accessToken: string) {
        return () => {
            for (let gapi of props.gapis) {
                window.gapi.load(gapi);
            }

            window.gapi.load('client:auth2', () => {
                window.gapi.client
                    .init({
                        apiKey,
                        clientId,
                        scope: 'https://www.googleapis.com/auth/drive',
                    })
                    .then(() => {
                        window.gapi.client.load('drive', 'v3', () => {
                            if (props.onGapisLoad) props.onGapisLoad();
                            setInitialized(true);
                        });
                    });
            });
        };
    }

    useEffect(() => {
        if (
            !loading &&
            initialized === false &&
            (props.authorization != Authorization.SHARED || (props.author && props.authorLoaded))
        ) {
            setInitialized(null);

            const authState = useAuth(props.authorization, session, props.author);

            // TODO: This is probably where the error is coming from
            if (session) {
                db.setCredentials(session.firebaseToken);
            }

            if (!authState.success) {
                router.push(authState.redirect);
            }

            if (props.gapis && session) {
                const loadApis = apiLoader(session.accessToken);

                if (window.google) {
                    loadApis();
                } else {
                    loadScript('https://apis.google.com/js/api.js', loadApis);
                }
            } else {
                setInitialized(true);
            }
        }

        //set progress bar state
        if (initialized === false || loading) NProgress.start();
        if (initialized) NProgress.done();
    }, [loading, props.author, props.authorLoaded, initialized]);

    const head = (
        <Head>
            <title>{props.title || 'MyPortfolio'}</title>
        </Head>
    );

    if (loading) {
        return head;
    } else if (!initialized) {
        return (
            <ErrorBoundary>
                {head}
                <Nav />
                <div style={{ height: '50vh' }}></div>
            </ErrorBoundary>
        );
    } else {
        return (
            <ErrorBoundary>
                {head}
                <Nav />
                <div className={classNames('font-light', !props.noPadding && 'px-7 py-6', props.className)}>
                    {props.children}
                </div>
            </ErrorBoundary>
        );
    }
}
