import Button, { StaticButtonProps } from './Button';
import { Parent, Props } from './types';
import { classNames } from '../util';
import { MdAdd, MdClose } from 'react-icons/md';
import { useState, useEffect } from 'react';

interface TagProps extends Parent, Props, StaticButtonProps {
    gradient?: boolean;
    active?: boolean;
    selected?: boolean;
    onClick?: (selected: boolean) => void;
}

export default function Tag(props: TagProps) {
    const [selected, setSelected] = useState(!!props.selected);
    const active = props.active || selected;

    useEffect(() => setSelected(!!props.selected), [props.selected]);

    return (
        <Button
            {...props}
            className={classNames(
                'py-2 px-3 rounded-lg text-sm flex items-center hover:text-white font-bold hover:shadow',
                active
                    ? props.gradient
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                        : 'bg-indigo-600'
                    : 'text-gray-500 bg-gray-100',
                active && 'text-white shadow',
                props.gradient ? 'bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500' : 'hover:bg-indigo-600',
                props.className
            )}
            icon={props.onClick && (active ? <MdClose size="1.2em" /> : <MdAdd size="1.2em" />)}
            onClick={
                props.onClick
                    ? (_e) => {
                          props.onClick(!selected);
                          setSelected((currentState) => !currentState);
                      }
                    : () => {}
            }
            customPadding
        >
            {props.children}
        </Button>
    );
}
