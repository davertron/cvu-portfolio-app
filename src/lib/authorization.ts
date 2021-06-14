import { homepage } from './util';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/client';

export interface AuthState {
    success: boolean
    redirect?: string
}

export enum Authorization {
    GUEST, USER
}

export function useAuth(authorization: Authorization, session: Session) : AuthState {

    switch(authorization){
        case Authorization.GUEST:
            return {success: !session, redirect: session ? homepage(session) : null};
        case Authorization.USER:
            if(session){
                if(session.error){
                    signOut();
                    return {success: false, redirect: '/'}
                }
            }
            
            return {success: !!session, redirect: '/'};
        default:
            return {success: true};
    }

}
