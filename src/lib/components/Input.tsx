import { Props } from './types';
import { classNames } from '../util';
import { Switch } from '@headlessui/react';
import { FormEvent, FormEventHandler } from 'react';

type StateSetter = (cb: Function) => any;

interface InputProps extends Props {
    type: string
    value: any
    name: string
    onInput?: FormEventHandler
    setForm?: StateSetter
}

function defaultHandler(setForm: StateSetter) : FormEventHandler {
    return (e: FormEvent<Element>) => {
        let val = e.target.value;
        const name = e.target.name;

        setForm(prevForm => {
            if(e.target.type == 'checkbox') val = !prevForm[name];

            return {
                ...prevForm,
                [name]: val
            }
        });
    }
}

function switchHandler(setForm: StateSetter, name: string) : (checked: boolean) => void {
    return (checked: boolean) => {
        setForm(prevForm => ({
            ...prevForm,
            [name]: checked
        }))
    }
}

export default function Input(props: InputProps){
    const baseClasses = 'rounded bg-gray-50 resize-none focus:outline-none px-3 py-2';
    const handler = props.onInput || props.setForm ? defaultHandler(props.setForm) : () => {};

    if(props.type == 'textarea'){
        return (
            <textarea
                onInput={handler}
                className={classNames(
                    baseClasses,
                    props.className
                )}
                value={props.value}
                name={props.name}
            >
            </textarea>
        );
    }else if(props.type == 'checkbox'){
        return (
            <Switch
                checked={props.value}
                onChange={switchHandler(props.setForm, props.name)}
                className={classNames(
                    props.value ? 'bg-indigo-400' : 'bg-gray-200',
                    'relative inline-flex items-center h-6 rounded-full w-11 focus:outline-none transition-colors'
                )}
            >
                <span
                    className={classNames(
                        props.value ? 'translate-x-6' : 'translate-x-1',
                        'inline-block w-4 h-4 transform bg-white rounded-full transition ease-in-out duration-200'
                    )}
                />
            </Switch>
        );
    }else{
        return (
            <input
                type={props.type}
                value={props.value}
                onInput={handler}
                name={props.name}
                className={classNames(
                    baseClasses,
                    props.className
                )}
            />
        );
    }
}
