import { Component } from 'react';

export interface Props {

}

export interface State {

}

export default class Base<PropType extends Props = {}, StateType extends State = {}> extends Component<PropType, StateType> {

    constructor(props){
        super(props);
        this.state = {};
    }

}
