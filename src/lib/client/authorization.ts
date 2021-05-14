import { Authorization } from '../common-types';
import { homepage } from './util';
import { Session, getSession } from 'next-auth/client';

export function useAuth(authorization: Authorization, session: Session) : [boolean, string] {
    
    switch(authorization){
        case Authorization.GUEST:
            return [!session, session ? homepage(session) : null];
        case Authorization.USER:
            return [!!session, '/'];
        default:
            return [true, null];
    }

}
