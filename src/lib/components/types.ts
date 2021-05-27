import { CSSProperties, MouseEventHandler } from 'react';

export interface Props {
    className?: string
    style?: CSSProperties
    key?: any
}

export interface Parent {
    children?: JSX.Element | JSX.Element[] | string
}

export interface Interactive {
    onClick?: MouseEventHandler
}
