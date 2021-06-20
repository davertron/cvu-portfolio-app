import Blog from './[uid]';
import { useSession } from 'next-auth/client';

export default function UserBlog(){
    const [session, loading] = useSession();

    if(session){
        return <Blog uid={session.user.id}/>;
    }else{
        return <Blog/>;
    }
}
