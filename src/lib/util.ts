import { Session } from 'next-auth';

export function classNames(...classes: string[]){
  return classes.filter(Boolean).join(' ');
}

export function homepage(session: Session){
    return '/users/' + session.user.id;
}
