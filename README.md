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
NEXT_PUBLIC_OAUTH_CLIENT_ID=...

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
#### Using Firebase Emulators
To use local Firebase emulators instead of connecting to the cloud, navigate to the `./gcloud/firebase` folder and install the `cvu-portfolio-app-firebase` project:
```bash
$ cd gcloud/firebase
$ git init
$ git remote add origin https://github.com/isaackrementsov/cvu-portfolio-app-firebase
$ git pull origin master
```
Then, globally install the Firebase module with npm.
```bash
$ npm i -g firebase
```
Also, make sure to install Java if you haven't already.
<br/><br/>
You should now be able to start the Firebase emulators (from the `./gcloud/firebase` directory) with
```bash
$ firebase emulators:start
```
To configure this app to use the emulators, simply add the following lines to `.env.local` and use the `npm run dev` command.
```js
NEXT_PUBLIC_NODE_ENV=development
FIRESTORE_EMULATOR_HOST=localhost:8080
```
### Production
To run this app in a production environment, first build the project with
```bash
$ npm run build
```
Then, start the server by running
```bash
$ npm run start
```
## Google Cloud Configuration
For additional information on configuring Google Cloud Services (OAuth, Drive API, Firebase), see the [Steps for Deployment](https://docs.google.com/document/d/1lO5hX13nfgE7n7jB77veT1LWHkohhYKS02S2xMbb1NA/edit?usp=sharing) document.
