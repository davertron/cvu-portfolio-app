import { Parent } from './types';
import loadScript from 'load-script';
import { useSession } from 'next-auth/client';
import { useState, useEffect } from 'react';

export interface PickerProps extends Parent {
    scope: string[]
    onInput: Function
    viewId: string
    multiple?: boolean
    onAuthError?: Function
}

const developerKey = process.env.NEXT_PUBLIC_API_KEY;

export default function Picker(props: PickerProps){
    const [session, loading] = useSession();
    const [createPicker, setCreatePicker] = useState(false);

    function create(google, token: string){
        const picker = new google.picker.PickerBuilder()
            .addView(google.picker.ViewId[props.viewId])
            .setOAuthToken(token)
            .setDeveloperKey(developerKey)
            .setCallback(props.onInput);

        if(props.multiple){
            picker.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
        }

        picker.build().setVisible(true);

        setCreatePicker(false);
    }

    useEffect(() => {
        if(createPicker && session && window.google) create(window.google, session.accessToken);

        if(!window.google){
            loadScript('https://apis.google.com/js/api.js', () => {
                window.gapi.load('auth2');
                window.gapi.load('picker');
            });
        }
    }, [createPicker, loading])

    return (
        <div onClick={() => setCreatePicker(true)}>
            {props.children || <button>Open Google Picker</button>}
        </div>
    );
}
