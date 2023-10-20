import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"
import axios from "axios";
import { MessageClient } from "../utils/comm/commMessage.js";
import { THING2_SECRETS } from "../utils/comm/test-vectors.js";
import { discloseClaims } from "../utils/sd-jwt/disclose-claims.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");

const DIDSender = "did:web:phamkv.github.io:things:thing2"
const DIDReceiver = "did:web:phamkv.github.io:service:discovery"
const sdJwt = fs.readFileSync(path.resolve(__dirname, "sd-jwt-test.json"), 'utf8');

const claims = "id @type" // this needs to be based on the presentation definition

const outSdJwt = await discloseClaims(sdJwt, claims);

const obj = {
  verifiable_credential: [{
    payload: outSdJwt
  }],
  presentation_submission: {
    id: String(Math.floor(Math.random() * 10000)),
    definition_id: "td_query_definition",
    descriptor_map: [
      {
        id: "thing_description_credential",
        format: "sd_jwt_vc",
        path: "$.verifiable_credential[0]"
      }
    ]
  },
  body: {
    types: ["saref:LightSwitch", "saref:Light", "saref:LightingDevice"]
  }
}

const messageClient = new MessageClient(DIDSender, THING2_SECRETS)

async function queryThings() {
  try {
    // Step 1: Make the first request and await its response
    const response1 = await axios.get('http://localhost:3000/query');
    const definition = response1.data;
    console.log('Step 1 response:', definition); // TODO: work with definition

    const body = await messageClient.createMessage(DIDReceiver, obj)
    const response2 = await axios.post('http://localhost:3000/query', body, {
      headers: {
        'content-type': 'application/didcomm-encrypted+json'
      },
    });
    const msg = await messageClient.unpackMessage(JSON.stringify(response2.data))
    console.log('Step 2 response:', msg);

    // TODO: Send request to issuer1

  } catch (error) {
    console.error('An error occurred:', error);
  }
}

queryThings();