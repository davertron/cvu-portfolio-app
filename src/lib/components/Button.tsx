/**
 * Button & Call To Action Components
 * Creates a button for user interaction
 */

import { classNames } from '../util';
import { Props, Parent, Interactive, Child } from './types';
import { MouseEventHandler } from 'react';
import Link from 'next/link';

export interface StaticButtonProps extends Props, Parent {
    icon?: Child
    href?: string
    target?: string
    center?: boolean
    customRounding?: boolean
    customPadding?: boolean
}

export interface ButtonProps extends StaticButtonProps, Interactive { }

interface CtaProps extends ButtonProps {
    gradient?: boolean
    invert?: boolean
    customBg?: boolean
    customFont?: boolean
}

export default function Button(props: ButtonProps){
    const content = props.icon ?
        <div className={classNames(
            'flex items-center',
            props.center && 'justify-center'
        )}>
            <div className="mr-2">{props.icon}</div>
            <div>{props.children}</div>
        </div>
        :
        props.children;

    return (
        <button
            className={classNames(
                'focus:outline-none transition-all',
                !props.customRounding && 'rounded',
                !props.customPadding && 'px-4 py-2',
                props.className
            )}
            onClick={props.onClick as MouseEventHandler}
        >
            {props.href ?
                props.target ?
                    <a href={props.href} target={props.target}>{content}</a>
                    :
                    <Link href={props.href}><a>{content}</a></Link>
                :
                content
            }
        </button>
    );
}

export function Cta(props: CtaProps){
    // Assign props to an extensible object
    let modified = {...props};
    modified.className = classNames(
        props.invert ? 'hover:shadow-lg' : 'hover:shadow',
        props.gradient && 'bg-gradient-to-r from-purple-500 to-indigo-500',
        !props.customBg && (props.invert ? 'bg-white text-indigo-400' : 'bg-indigo-500 text-white'),
        !props.customFont && 'font-bold',
        props.className
    );

    return <Button {...modified}/>;
}
