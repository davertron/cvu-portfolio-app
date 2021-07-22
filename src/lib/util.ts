import { Model } from './db/models';
import { Timestamp } from './db/util';
import { Session } from 'next-auth';

declare global {
    interface Array<T> {
        separate(predicate: (elem: T) => boolean): [T[], T[]]
    }

    interface String {
        toTitleCase(): String
    }
}

Array.prototype.separate = function(predicate){
    let filtered = [];
    let removed = [];

    for(let elem of this){
        if(predicate(elem)){
            filtered.push(elem);
        }else{
            removed.push(elem);
        }
    }

    return [filtered, removed];
}

String.prototype.toTitleCase = function(){
    if(this.length > 0) return this[0].toUpperCase() + this.substring(1, this.length).toLowerCase();
}

export function classNames(...classes: string[]){
  return classes.filter(Boolean).join(' ');
}

export function warnUnsavedChanges(e){
    e.preventDefault();
    e.returnValue = '';
}

export function warnIfUnsaved(unsaved: boolean){
    if(unsaved){
        window.onbeforeunload = warnUnsavedChanges;
    }else if(window.onbeforeunload){
        window.onbeforeunload = null;
    }
}

export function loadStarted(loadState: boolean){
    return loadState || loadState == null;
}

export function homepage(session: Session){
    return '/users/' + session.user.id;
}

export function merge<T extends Model>(original: T[], update: T[], uniqueProp: string) : T[] {
    let merged = original.map(a => {
        const isUnique = b => b[uniqueProp] != a[uniqueProp];

        const [remaining, duplicates] = update.separate(isUnique);
        update = remaining;

        return duplicates.length > 0 ? a.with(duplicates[0]) : a;
    });

    return merged.concat(update);
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const dateString = (timestamp: Timestamp) => {
    const date = timestamp.toDate();

    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

export const valueOf = (timestamp: Timestamp) => timestamp.toDate().valueOf();
export const createdAt = (a,b) => (a.created_at && b.created_at) ?  valueOf(b.created_at) - valueOf(a.created_at) : 0;
