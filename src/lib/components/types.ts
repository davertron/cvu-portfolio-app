import { CSSProperties, MouseEventHandler } from 'react';

export type Child = JSX.Element | string;

export interface Props {
    className?: string
    style?: CSSProperties
    key?: any
}

export interface Parent {
    children?: Child | Child[]
}

export interface Interactive {
    onClick?: MouseEventHandler
}
