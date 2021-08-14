import { Component } from 'react';
import Custom500 from '../../pages/500';

// This component is written in the class style because there is no hook for componentDidCatch yet
export default class ErrorBoundary extends Component<{}, {errored: boolean}> {

    static getDerivedStateFromError(){
        return {errored: true}
    }

    constructor(props){
        super(props);
        this.state = {errored: false};
    }

    componentDidCatch(){
        this.setState({errored: true});
    }

    render(){
        if(this.state.errored){
            return <Custom500/>;
        }

        try {
            return this.props.children;
        }catch(_e){
            return <Custom500/>;
        }
    }

}
