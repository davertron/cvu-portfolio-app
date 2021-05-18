import db from '../../../lib/api/db';
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
            let existing = await db.user.findUnique({where: {
                email: user.email
            }});

            if(!existing){
                existing = await db.user.create({data: {
                    email: user.email,
                    bio_pic: user.picture
                }});
            }

            session.user.id = existing.id;

            return Promise.resolve(session);
        }
    }
});
