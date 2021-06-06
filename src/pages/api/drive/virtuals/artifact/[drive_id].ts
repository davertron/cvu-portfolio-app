import { google } from 'googleapis';

interface ArtifactVirtuals {
    title?: string
    icon?: string
    thumbnail?: string
}

const client = new google.auth.OAuth2(
    process.env.OAUTH_CLIENT_ID,
    process.env.OAUTH_CLIENT_SECRET
);

export default async function handler(req, res){
    let data: ArtifactVirtuals = {};
    const { token, drive_id, refresh_thumbnail } = req.query;

    try {
        if(token && drive_id){
            client.setCredentials({access_token: token});

            const drive = google.drive({version: 'v3', auth: client});
            const storage = google.storage({version: 'v1', auth: client});

            switch(req.method){
                case 'PATCH':
                case 'GET':
                    const res = await drive.files.get({
                        fileId: drive_id,
                        fields: 'name,iconLink,thumbnailLink'
                    });
                    const file = res.data;
                    let thumbnail: string;
                    const thumbnails = await storage.buckets.get({bucket: ''});

                    if(refresh_thumbnail || !thumbnail){
                        const fileContent = await client.request({url: `https://drive.google.com/thumbnail?id=${drive_id}`});
                    }

                    data = {
                        thumbnail,
                        icon: file.iconLink,
                        title: file.name
                    };
            }
        }
    }catch(e){ console.log('Error handling request', e); }

    res.json(data);
}
