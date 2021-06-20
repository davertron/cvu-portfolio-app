import db, { id } from '../../../lib/db';
import NextAuth from 'next-auth';
import Providers from 'next-auth/providers';

async function refreshAccessToken(token){
    try {
        const url = 'https://oauth2.googlepis.com/token?' +
            new URLSearchParams({
                client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
                client_secret: process.env.OAUTH_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken
            });

        const res = await fetch(url, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            method: 'POST'
        });

        const refreshed = await res.json();

        if(!res.ok){
            throw refreshed;
        }

        return {
            ...token,
            accessToken: refreshed.access_token,
            accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
            refreshToken: refreshed.refresh_token || token.refreshToken
        }
    }catch(e){
        return {
            ...token,
            error: 'RefreshAccessTokenError'
        }
    }
}

export default NextAuth({

    providers: [
        Providers.Google({
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET,
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth?prompt=consent&access_type=offline&response_type=code',
            scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile'
        })
    ],

    callbacks: {
        async jwt(token, user, account){
            if(account && user){
                return {
                    accessToken: account.accessToken,
                    accessTokenExpires: Date.now() + account.expires_in * 1000,
                    refreshToken: account.refresh_token,
                    user
                };
            }

            if(Date.now() < token.accessTokenExpires){
                return token;
            }

            return refreshAccessToken(token);
        },

        async session(session, token){
            session.user = token.user;

            const snapshot = await db.users.where('email', '==', session.user.email).get();
            let userId: string;

            if(snapshot.docs.length > 0){
                userId = snapshot.docs[0].id;
            }else{
                userId = id();

                await db.users.doc(userId).set({
                    name: session.user.name,
                    email: session.user.email.toLowerCase().trim(),
                    bio_pic: session.user.image as string,
                });
            }

            session.user.id = userId;
            session.accessToken = token.accessToken as string;
            session.error = token.error;

            return Promise.resolve(session);
        }
    }

});
