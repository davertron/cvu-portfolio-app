import db, { id } from '../../../lib/db';
import NextAuth from 'next-auth';
import Providers from 'next-auth/providers';

export default NextAuth({

    providers: [
        Providers.Google({
            clientId: process.env.OAUTH_CLIENT_ID,
            clientSecret: process.env.OAUTH_CLIENT_SECRET
        })
    ],

    callbacks: {
        session: async (session, user) => {
            const snapshot = await db.users.where('email', '==', user.email).get();
            let userId: string;

            if(snapshot.docs.length > 0){
                userId = snapshot.docs[0].id;
            }else{
                userId = id();
                await db.users.doc(userId).set({
                    name: user.name,
                    email: user.email,
                    bio_pic: user.picture as string
                });
            }

            session.user.id = userId;

            return Promise.resolve(session);
        }
    }

});
