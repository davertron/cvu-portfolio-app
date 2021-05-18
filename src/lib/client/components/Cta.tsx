import { classNames } from '../util';

interface ButtonProps {
    onClick: Function,
    className?: string,
    gradient?: boolean
}

export default function Cta(props: ButtonProps){
    return (
        <button
            className={classNames(
                'px-4 py-2 text-white rounded font-bold hover:shadow focus:outline-none',
                props.gradient ? 'bg-gradient-to-r from-purple-500 to-indigo-500' : 'bg-indigo-500',
                props.className
            )}
            onClick={props.onClick}
        >
            {props.children}
        </button>
    );
}
