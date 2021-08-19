interface Custom404Props {
    message?: string;
}

export default function Custom404(props: Custom404Props) {
    return (
        <div
            className="text-center flex flex-col justify-center text-white bg-gradient-to-r from-purple-400 to-indigo-700"
            style={{ height: '100vh' }}
        >
            <div>
                <h1 className="font-bold my-1" style={{ fontSize: '4em' }}>
                    404
                </h1>
                <h1 className="my-3 text-xl font-bold">{props.message || 'Page not found'}</h1>
                <a href="/" className="underline">
                    Return to homepage
                </a>
            </div>
        </div>
    );
}
