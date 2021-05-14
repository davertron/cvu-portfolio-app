import '../../styles/globals.css';
import { Provider } from 'next-auth/client';

function App({ Component, pageProps }) {
    return (
        <Provider session={pageProps.session}>
            <Component {...pageProps}/>
        </Provider>
    );
}

export default App;
