import { Authorization } from '../../lib/authorization';
import Layout from '../../lib/components/Layout';
import Input from '../../lib/components/Input';
import Cta from '../../lib/components/Cta';
import Picker from '../../lib/components/Picker';
import db, { FileCollection, Artifact } from '../../lib/db';
import drive from '../../lib/drive';
import { useSession } from 'next-auth/client';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { MdCloudUpload } from 'react-icons/md';

export default function Collection(){
    const clientId = process.env.OAUTH_CLIENT_ID;
    const developerKey = process.env.API_KEY;

    const [session, loading] = useSession();

    const [collection, setCollection] = useState({} as FileCollection);
    const [artifacts, setArtifacts] = useState([] as Artifact[]);
    const [editing, setEditing] = useState(false);

    const router = useRouter();
    const { id } = router.query;
    const creating = id == 'new';
    const showInputs = creating || editing;

    async function getData(){

    }

    return (
        <Layout authorization={Authorization.USER} noPadding>
            <div className="flex flex-col items-center bg-gradient-to-r from-purple-400 to-indigo-500 w-full py-16 text-white">
                <div>
                    {showInputs ?
                        <Input
                            type="text"
                            placeholder="Collection Title"
                            className="font-bold text-2xl text-center bg-gray-100 bg-opacity-0 focus:bg-opacity-10 placeholder-gray-300"
                            setForm={setCollection}
                            value={collection.title}
                            customBg
                        />
                        :
                        <h1 className="font-bold text-2xl text-center">{collection.title}</h1>
                    }
                </div>
                <div className="my-7">
                    <Picker
                        scope={[]}
                        onInput={async picked => {
                            if(picked.docs){
                                let updatedArtifacts = artifacts;

                                for(let i = 0; i < picked.docs.length; i++){
                                    const doc = picked.docs[i];
                                    const metadata = await drive.metadata(doc.id);
                                    console.log(metadata);
                                    updatedArtifacts.push({
                                        drive_id: doc.id,
                                        title: doc.name,
                                        icon: doc.iconUrl
                                    });
                                }
                            }
                        }}
                        viewId="DOCS"
                        multiple
                    >
                        <Cta invert>
                            <><MdCloudUpload className="inline mr-3"/>Add files from Drive</>
                        </Cta>
                    </Picker>
                </div>
            </div>
            <div className="flex flex-wrap justify-center w-screen rounded py-3 px-5 text-gray-600">
                {artifacts.map(artifact => {
                    <div>

                    </div>
                })}
            </div>
        </Layout>
    );
}
