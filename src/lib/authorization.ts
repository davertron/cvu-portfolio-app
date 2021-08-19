import { User } from './db/models';
import { homepage } from './util';
import { Session } from 'next-auth';
import { signOut } from 'next-auth/client';

export interface AuthState {
    success: boolean;
    redirect?: string;
}

export enum Authorization {
    GUEST,
    USER,
    SHARED,
}

export function useAuth(authorization: Authorization, session: Session, author?: User): AuthState {
    switch (authorization) {
        case Authorization.GUEST:
            return { success: !session, redirect: session ? homepage(session) : null };
        case Authorization.USER:
            if (session) {
                if (session.error) {
                    signOut();
                    return { success: false, redirect: '/' };
                }
            }

            return { success: !!session, redirect: '/' };
        case Authorization.SHARED:
            const home = session ? homepage(session) : '/';

            if (author && author.shared_with) {
                if (session) {
                    if (session.user.email) {
                        return {
                            success:
                                session.user.email == author.email ||
                                !!author.shared_with.find((p) => p.email == session.user.email),
                            redirect: home,
                        };
                    }
                }
            }

            return { success: false, redirect: home };
        default:
            return { success: true };
    }
}
