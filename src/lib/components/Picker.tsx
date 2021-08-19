import { Parent } from './types';
import { fileIndicators } from './fileIndicators';
import loadScript from 'load-script';
import { useSession } from 'next-auth/client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

interface PickerProps extends Parent {
    scope: string[];
    onInput: Function;
    viewId: string;
    multiple?: boolean;
    onAuthError?: Function;
}

const developerKey = process.env.NEXT_PUBLIC_API_KEY;

// Drive's non-shortcut mime types
const DRIVE_TYPES = Object.keys(fileIndicators).map((type) => `application/vnd.google-apps.${type}`);

export default function Picker(props: PickerProps) {
    const [session, loading] = useSession();
    const [createPicker, setCreatePicker] = useState(false);
    const router = useRouter();

    function create(google, token: string) {
        const view = new google.picker.DocsView(google.picker.ViewId[props.viewId]);
        view.setMimeTypes(DRIVE_TYPES.join(','));
        view.setOwnedByMe(true);

        const picker = new google.picker.PickerBuilder()
            .addView(view)
            .setOAuthToken(token)
            .setDeveloperKey(developerKey)
            .setCallback(props.onInput);

        if (props.multiple) {
            picker.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
        }

        picker.build().setVisible(true);

        setCreatePicker(false);
    }

    useEffect(() => {
        if (createPicker && session && window.google) {
            if (session.error) {
                router.push('/');
            } else {
                create(window.google, session.accessToken);
            }
        }

        if (!window.google) {
            loadScript('https://apis.google.com/js/api.js', () => {
                window.gapi.load('auth2');
                window.gapi.load('picker');
            });
        }
    }, [createPicker, loading]);

    return <div onClick={() => setCreatePicker(true)}>{props.children || <button>Open Google Picker</button>}</div>;
}
