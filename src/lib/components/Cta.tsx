/**
 * Call To Action Component
 * Creates a button for user interaction
 */

import { classNames } from '../util';
import { Props, Parent, Interactive } from './types';

interface ButtonProps extends Props, Parent, Interactive {
    gradient?: boolean
    invert?: boolean
}

export default function Cta(props: ButtonProps){
    return (
        <button
            className={classNames(
                'px-4 py-2 rounded font-bold hover:shadow focus:outline-none',
                props.gradient && 'bg-gradient-to-r from-purple-500 to-indigo-500',
                props.invert ? 'bg-white text-indigo-400' : 'bg-indigo-500 text-white',
                props.className
            )}
            onClick={props.onClick}
        >
            {props.children}
        </button>
    );
}
