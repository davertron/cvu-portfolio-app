import '../../styles/globals.css';
import '../../styles/nprogress.css';
import NProgress from 'nprogress';
import { Provider } from 'next-auth/client';

NProgress.configure({showSpinner: false});

function App({ Component, pageProps }) {
    return (
        <Provider session={pageProps.session}>
            <Component {...pageProps}/>
        </Provider>
    );
}

export default App;
