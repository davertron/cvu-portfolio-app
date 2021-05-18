import { Authorization } from '../common-types';
import bodyParser from 'body-parser';
import { NextApiRequest, NextApiResponse } from 'next';
import nc, { Middleware } from 'next-connect';
import { getSession } from 'next-auth/client';
import { Session } from 'next-auth';

export interface ApiRequest extends NextApiRequest {
    session: Session,
    files?: any[]
}

export function authorize(authorization: Authorization) : Middleware<ApiRequest, NextApiResponse> {
    return (req, res, next) => {
        let authorized = true;

        switch(authorization){
            case Authorization.GUEST:
                authorized = !req.session.user.id;
                break;
            case Authorization.USER:
                authorized = !!req.session.user.id;
                break;
        }

        if(authorized){
            next();
        }else{
            res.status(403).json({'error': 'You are not authorized to access endpoint ' + req.url});
        }
    }
}

export const authorizeUser = authorize(Authorization.USER);
export const authorizeGuest = authorize(Authorization.GUEST);

const app = nc<ApiRequest, NextApiResponse>();

app.use(async (req, res, next) => {
    req.session = await getSession();
    next();
}, bodyParser.json());

export default app;
