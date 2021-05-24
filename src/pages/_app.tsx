import '../../styles/globals.css';
import '../../styles/nprogress.css';
import NProgress from 'nprogress';
import { Provider } from 'next-auth/client';
import Head from 'next/head';

NProgress.configure({showSpinner: false});

function App({ Component, pageProps }) {
    return (
        <Provider session={pageProps.session}>
            <Head>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            </Head>
            <Component {...pageProps}/>
        </Provider>
    );
}

export default App;
