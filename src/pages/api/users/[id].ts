import app from '../../../lib/api/app';
import db from '../../../lib/api/db';

export default app
    .get(async (req, res) => {
        let { id } = req.query;

        const user = await db.user.findUnique({where: {id}});

        if(user){
            return res.json({user});
        }else{
            return res.json({error: 'Could not find user matching id ' + id});
        }
    });
