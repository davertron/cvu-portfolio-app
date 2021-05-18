# cvu-portfolio-app
Web app for CVU students to arrange Drive files by learning standards

## Environment Configuration
### Install Dependencies
Start by installing the required Node dependencies with
```bash
$ npm install
```
### Add OAuth Credentials
Create a `next.config.js` file and add OAuth credentials like so:
```js
module.exports = {
    env: {
        OAUTH_CLIENT_ID: 'YOUR_OAUTH_CLIENT_ID',
        OAUTH_CLIENT_SECRET: 'YOUR_OAUTH_CLIENT_SECRET'
    }
}
```
### Setup Prisma
First, create a file named `.env` to store your database url:
```js
DATABASE_URL = "YOUR_DATABASE_URL"
```
Prisma is currently configured to work with MySQL, but you can change that by editing the `datasource.provider` section in `prisma/schema.prisma`. Otherwise, `YOUR_DATABASE_URL` should follow the `mysql://user:password@host/db` format.
<br/>
Once you save `.env`, pull the schema to your database and generate the Prisma client:
```bash
$ npx prisma migrate dev
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
