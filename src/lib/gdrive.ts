import { OAuth2Client } from 'googleapis-common';
import { google } from 'googleapis';
import fs from 'fs';
import readline from 'readline';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export default class GDriveClient {

    credentialPath: string;
    tokenPath: string;
    
    private client: OAuth2Client;

    constructor(config){
        Object.assign(this, config);
    }

    private async checkCredentials(credentials: JSON){
        const { client_secret, client_id, redirect_uris } = credentials['installed'];
        this.client = new google.auth.OAuth2(client_id, client_secret, redirect_uris);

        try {
            const token = await readFile(this.tokenPath);
            this.client.setCredentials(JSON.parse(token));
        }catch(_e){
            console.log('Failed to read token from ' + this.tokenPath);
        }
    }

    private async authorize(){
        try {
            const data = await readFile(this.credentialPath);
            this.checkCredentials(JSON.parse(data));
        }catch(_e){
            console.log('Error loading credentials from ' + this.credentialPath);
        }
    }

}
