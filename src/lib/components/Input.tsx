import { Props, Parent } from './types';
import { classNames } from '../util';
import Error from './Error';
import { Switch } from '@headlessui/react';
import { FormEvent, FormEventHandler, useState } from 'react';
import Files from 'react-files';

export type StateSetter = (cb: Function | Object) => any;

interface InputProps extends Props, Parent {
    type: string
    name?: string
    listClassname?: string
    options?: string[]
    value?: any
    onBlur?: FormEventHandler
    onFocus?: FormEventHandler
    onInput?: FormEventHandler
    onError?: FormEventHandler
    setForm?: StateSetter
    setFiles?: StateSetter
    placeholder?: string
    customBg?: boolean
    noPadding?: boolean
    customRounding?: boolean
}

function defaultHandler(setForm: StateSetter) : FormEventHandler {
    return (e: FormEvent<Element>) => {
        let val = e.target.value;
        let name = e.target.name;
        name = name.split('_')[0];

        setForm(prevForm => {
            if(e.target.type == 'checkbox') val = !prevForm[name];

            return {
                ...prevForm,
                [name]: val
            }
        });
    }
}

function staticHandler(setForm: StateSetter, name: string) {
    return (e: FormEvent<Element>) => {
        let val = e.target.getAttribute('value');
        name = name.split('_')[0];

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
        'resize-none focus:outline-none',
        !props.customBg && 'bg-gray-50',
        !props.noPadding && 'px-3 py-2',
        !props.customRounding && 'rounded'
    );
    const handler = props.onInput || props.setForm ? defaultHandler(props.setForm) : () => {};
    const [error, setError] = useState(null);

    if(props.type == 'textarea'){
        return (
            <textarea
                onInput={handler}
                onBlur={props.onBlur}
                onFocus={props.onFocus}
                className={classNames(
                    baseClasses,
                    props.className
                )}
                value={props.value}
                name={props.name}
                placeholder={props.placeholder}
                id={props.id}
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
                id={props.id}
                onFocus={props.onFocus}
                onBlur={props.onBlur}
            >
                <span
                    className={classNames(
                        props.value ? 'translate-x-6' : 'translate-x-1',
                        'inline-block w-4 h-4 transform bg-white rounded-full transition ease-in-out duration-200'
                    )}
                />
            </Switch>
        );
    }else if(props.type == 'file'){
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
              id={props.id}
              onFocus={props.onFocus}
              onBlur={props.onBlur}
            >
                {error && <Error error={error}/>}
                {props.children}
            </Files>
        );
    }else if(props.type == 'datalist'){
        const [focused, setFocused] = useState(false);
        const handleOption = staticHandler(props.setForm, props.name);
        const dataListBaseClasses = classNames(
            !props.customRounding && 'rounded',
            !props.customBg && 'bg-gray-50'
        );
        const options = props.options.filter(option => option.toLowerCase().includes(props.value.toLowerCase()));

        return (
            <div onBlur={() => setFocused(false)}>
                <div>
                    <Input
                        {...props}
                        type="text"
                        value={props.value}
                        className={classNames(props.className, 'w-full')}
                        onFocus={() => setFocused(true)}
                    />
                </div>
                {options.length > 0 && <ul className={classNames('py-1 my-1 z-10 absolute', dataListBaseClasses, props.listClassname)}>
                    {options.map((option, i) => (
                      <li
                        key={props.name + '-option-' + i}
                        className="bg-white bg-opacity-0 hover:bg-opacity-30 py-1 px-3 transition-all cursor-pointer"
                        onClick={handleOption}
                        value={option}
                      >
                        {option}
                      </li>
                    ))}
                </ul>}
            </div>
        )
    }else{
        return (
            <input
                type={props.type}
                value={props.value}
                onBlur={props.onBlur}
                onFocus={props.onFocus}
                onInput={handler}
                name={props.name}
                placeholder={props.placeholder}
                id={props.id}
                className={classNames(
                    baseClasses,
                    props.className
                )}
            />
        );
    }
}
