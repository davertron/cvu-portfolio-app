import Db from './base';
import serviceAccount from '../../../absolute-vertex-313616-firebase-adminsdk-vifps-466e95852d.json';
import * as admin from 'firebase-admin';

const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

// Db using server-side firebase library
class AdminDb extends Db {

    app: admin.app.App;
    store: admin.firestore.Firestore;
    auth: admin.auth.Auth;

    constructor(app: admin.app.App){
        super(app);
        
        this.app = app;
        this.auth = app.auth();
        this.store = app.firestore();
    }

    async createToken(uid: string, claims: {[key: string]: any} = {}){
        return await this.auth.createCustomToken(uid, claims);
    }

}

const app = admin.apps.length? admin.apps[0] : admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    databaseURL
});

app.auth()

const db = new AdminDb(app);
export default db;
