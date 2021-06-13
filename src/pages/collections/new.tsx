// collections/new has its own component to prevent getServersideProps in collections/[id] from resetting page data
import Collection from './[id]';

export default function NewCollection(){
    return <Collection creating/>
}
