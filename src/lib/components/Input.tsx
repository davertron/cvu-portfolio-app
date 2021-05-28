import { Props, Parent } from './types';
import { classNames } from '../util';
import Error from './Error';
import { Switch } from '@headlessui/react';
import { FormEvent, FormEventHandler, useState } from 'react';
import Files from 'react-files';

type StateSetter = (cb: Function | Object) => any;

interface InputProps extends Props, Parent {
    type: string
    name?: string
    value?: any
    onInput?: FormEventHandler
    onError?: FormEventHandler
    setForm?: StateSetter
    setFiles?: StateSetter
    placeholder?: string
    customBg?: boolean
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

function fileHandler(setFiles: StateSetter, name?: string) : (files: any[]) => void {
    return (files: any[]) => {
        setFiles(files);
    }
}

export default function Input(props: InputProps){
    const baseClasses = classNames(
        'rounded resize-none focus:outline-none px-3 py-2',
        !props.customBg && 'bg-gray-50'
    );
    const handler = props.onInput || props.setForm ? defaultHandler(props.setForm) : () => {};
    const [error, setError] = useState(null);

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
                placeholder={props.placeholder}
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
    }if(props.type == 'file'){
        const handleFiles = fileHandler(props.setFiles);

        return (
            <Files
              className="cursor-pointer"
              onChange={e => {
                  handleFiles(e);
                  setError(null);
              }}
              onError={props.onError || (() => setError('Error processing file'))}
              accepts={['image/png', 'image/jpg', 'image/svg', 'image/bmp', 'image/jpeg']}
              maxFileSize={10000000}
              minFileSize={0}
            >
                {error && <Error error={error}/>}
                {props.children}
            </Files>
        );
    }else{
        return (
            <input
                type={props.type}
                value={props.value}
                onInput={handler}
                name={props.name}
                placeholder={props.placeholder}
                className={classNames(
                    baseClasses,
                    props.className
                )}
            />
        );
    }
}
