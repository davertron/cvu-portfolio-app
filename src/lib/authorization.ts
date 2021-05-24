import { homepage } from './util';
import { Session } from 'next-auth';

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
            return {success: !!session, redirect: '/'};
        default:
            return {success: true};
    }

}
