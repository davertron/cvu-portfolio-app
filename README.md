# cvu-portfolio-app
Web app for CVU students to arrange Drive files by learning standards

## Environment Configuration
### Install Dependencies
Start by installing the required Node dependencies with
```bash
$ npm install
```
### Add OAuth & Firebase Credentials
Create a `.env.local` file and add OAuth/Firebase credentials like so:
```js
NEXT_PUBLIC_API_KEY=...

OAUTH_CLIENT_ID=...
OAUTH_CLIENT_SECRET=...

NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
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
