import db from '../../../lib/db/server';
import { User, TokenRecord } from '../../../lib/db/models';
import { encrypt } from '../../../lib/authorization';
import NextAuth, { Session } from 'next-auth';
import Providers from 'next-auth/providers';

async function refreshAccessToken(token){
    try {
        const url = 'https://oauth2.googlepis.com/token?' +
            new URLSearchParams({
                client_id: process.env.OAUTH_CLIENT_ID,
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

            if(Date.now() < (token.accessTokenExpires as number)){
                return token;
            }

            return refreshAccessToken(token);
        },

        async session(session: Session, token: Session){
            session.user = token.user;
            const accessToken = token.accessToken as string;

            const snapshot = await db.users.where('email', '==', session.user.email).get();
            let user: User;

            if(snapshot.empty){
                user = new User({
                    name: session.user.name,
                    email: session.user.email.toLowerCase().trim(),
                    bio_pic: session.user.image as string
                })

                await db.users.doc(user.id).set(user);
            }else{
                user = snapshot.docs[0].data();
            }

            session.firebaseToken = await db.createToken(user.id, user);

            session.user.id = user.id;
            session.user.role = user.role;
            session.user.bio_pic = user.bio_pic;
            session.accessToken = token.accessToken as string;
            session.error = token.error;

            return Promise.resolve(session);
        }
    },

    events: {
        async signOut(message: Session){
            //await removeTokenRecord(message.accessToken);
        }
    }
});
