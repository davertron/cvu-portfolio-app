import { UserRole } from '../db';
import auth from 'next-auth';

declare module 'next-auth' {

    interface Session {
        user: {
            id: string
            image: string
            name: string
            email: string
            bio_pic: string
            role: UserRole
        },
        accessToken: string
        expires: string
        accessToken: string
        error?: any
    }

}
