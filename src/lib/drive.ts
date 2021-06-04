export interface Metadata {

}

async function getMetadata(fileId: string) : Metadata {
    try {
        console.log(fileId)
        const res = await fetch('https://www.googleapis.com/drive/v2/files/' + fileId);
        const data = await res.json();

        if(data.error){
            return {};
        }else{
            return data;
        }
    }catch(e){
        console.log(e);
        return {};
    }
}

const drive = {
    metadata: getMetadata
}

export default drive;
