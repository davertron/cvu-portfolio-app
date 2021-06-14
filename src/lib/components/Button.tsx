/**
 * Button & Call To Action Components
 * Creates a button for user interaction
 */

import { classNames } from '../util';
import { Props, Parent, Interactive, Child } from './types';

interface ButtonProps extends Props, Parent, Interactive {
    icon?: Child
    customRounding?: boolean
    customPadding?: boolean
}

interface CtaProps extends ButtonProps {
    gradient?: boolean
    invert?: boolean
    customBg?: boolean
    customFont?: boolean
}

export default function Button(props: ButtonProps){
    return (
        <button
            className={classNames(
                'focus:outline-none transition-all',
                !props.customRounding && 'rounded',
                !props.customPadding && 'px-4 py-2',
                props.className
            )}
            onClick={props.onClick}
        >
            {props.icon ?
                <div className="flex items-center">
                    <div className="mr-3">{props.icon}</div>
                    <div>{props.children}</div>
                </div>
                :
                props.children
            }
        </button>
    );
}

export function Cta(props: CtaProps){
    // Assign props to an extensible object
    let modified = {...props};
    modified.className = classNames(
        'hover:shadow',
        props.gradient && 'bg-gradient-to-r from-purple-500 to-indigo-500',
        !props.customBg && (props.invert ? 'bg-white text-indigo-400' : 'bg-indigo-500 text-white'),
        !props.customFont && 'font-bold',
        props.className
    );

    return <Button {...modified}/>;
}
