// collections/new has its own component to prevent getServersideProps in collections/[id] from resetting page data in development (will likely be removed in production)

import { Authorization } from '../../lib/authorization';
import Collection from './[id]';

export default function NewCollection(){
    return <Collection authorization={Authorization.USER} creating/>
}
