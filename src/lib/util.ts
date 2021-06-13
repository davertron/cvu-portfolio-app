import { Session } from 'next-auth';

declare global {
    interface Array<T> {
        separate(predicate: (elem: T) => boolean): [T[], T[]]
    }
}

Array.prototype.separate = function(predicate){
    let filtered = [];
    let removed = [];

    for(let elem in this){
        if(predicate(elem)){
            filtered.push(elem);
        }else{
            removed.push(elem);
        }
    }

    return [filtered, removed];
}

export function classNames(...classes: string[]){
  return classes.filter(Boolean).join(' ');
}

export function homepage(session: Session){
    return '/users/' + session.user.id;
}

export function merge<T>(original: T[], update: T[], uniqueProp: string) : T[] {
    let merged = original.map(a => {
        const isUnique = b => b[uniqueProp] != a[uniqueProp];

        const [remaining, duplicates] = update.separate(isUnique);
        update = remaining;

        return duplicates.length > 0 ? {...a, ...duplicates[0]} : a;
    });

    return merged.concat(update);
}
