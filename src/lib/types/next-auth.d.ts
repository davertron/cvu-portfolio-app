import { UserRole } from '../db/models';
import auth from 'next-auth';

declare module 'next-auth' {

    interface Session {
        user: {
            id: string;
            image: string;
            name: string;
            email: string;
            bio_pic: {
                url: string;
                name: string;
            };
            role: UserRole;
        },
        accessToken: string;
        expires: string;
        firebaseToken: string;
        firebaseAuth?: boolean;
        error?: any;
    }

}
