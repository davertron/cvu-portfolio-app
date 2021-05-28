# cvu-portfolio-app
Web app for CVU students to arrange Drive files by learning standards

## Environment Configuration
### Install Dependencies
Start by installing the required Node dependencies with
```bash
$ npm install
```
### Add OAuth & Firebase Credentials
Create a `next.config.js` file and add OAuth/Firebase credentials like so:
```js
module.exports = {
    env: {
        OAUTH_CLIENT_ID: 'OAUTH_CLIENT_ID',
        OAUTH_CLIENT_SECRET: 'OAUTH_CLIENT_SECRET',

        FIREBASE_API_KEY: 'FIREBASE_API_KEY',
    	FIREBASE_AUTH_DOMAIN: 'AUTH_DOMAIN',
    	FIREBASE_PROJECT_ID: 'PROJECT_ID',
    	FIREBASE_STORAGE_BUCKET: 'STORAGE_BUCKET',
    	FIREBASE_MESSAGING_SENDER_ID: 'SENDER_ID',
    	FIREBASE_APP_ID: 'FIREBASE_APP_ID'
    }
}
```
## Running
### Development
To run this app in development mode, simply use
```bash
$ npm run dev -p <PORT>
```
If the `-p` flag is omitted, Next will run on port 3000.
### Production
To run this app in a production environment, first build the project with
```bash
$ npm run build
```
Then, start the server by running
```bash
$ npm run start
```
