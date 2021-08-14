import { HiOutlineExclamation } from 'react-icons/hi';

export default function Custom500(){
    return (
        <div
            className="text-center flex flex-col justify-center text-white bg-gradient-to-r from-purple-400 to-indigo-700"
            style={{height: '100vh'}}
        >
            <div>
                <HiOutlineExclamation className="mx-auto my-5" size={100}/>
                <h1 className="my-3 text-xl font-bold">Something's not working...</h1>
                <a href="/" className="underline">Return to homepage</a>
            </div>
        </div>
    );
}
