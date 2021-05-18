import { Session } from 'next-auth/session';

export function classNames(...classes: string[]){
  return classes.filter(Boolean).join(' ');
}

export function homepage(session: Session){
    return '/users/' + session.user.id;
}
