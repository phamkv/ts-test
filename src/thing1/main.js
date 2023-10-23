import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"
import axios from "axios";
import https from "https"
import { MessageClient } from "../utils/comm/commMessage.js";
import { THING1_SECRETS } from "../utils/comm/test-vectors.js";
import { discloseClaims } from "../utils/sd-jwt/disclose-claims.js";
import { startThingExample } from "../utils/wot/wot.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");

// ONLY FOR DEMO / DEVELOPMENT PURPOSES
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const instance = axios.create({ httpsAgent })

const DIDSender = "did:web:phamkv.github.io:things:thing1"
const sdJwt = fs.readFileSync(path.resolve(__dirname, "sd-jwt-test.json"), 'utf8');

const messageClient = new MessageClient(DIDSender, THING1_SECRETS)

async function registerThing(url, DIDReceiver) {
  try {
    // Step 1: Make the first request and await its response
    const response1 = await instance.get(url + "TDDRegistration");
    const definition = response1.data;
    console.log('Step 1 response:', definition);

    // Set disclosed attributes according to definition
    const constraints = definition.presentation_definition.input_descriptors[0].constraints.fields[0].path
    console.log(constraints)
    const claims = constraints.filter(element => element.includes("$.disclosed")).map(str => {
      const parts = str.split('.')
      let propName = parts[parts.length - 1]
      if (propName.includes('[')) {
        propName = propName.replace(/[\[\]']/g, '')
        propName = propName.replace("disclosed", '')
      }
      return propName
    }) // ["id", "title", "@type", "security"]
    const outSdJwt = await discloseClaims(sdJwt, claims);
    const obj = {
      verifiable_credential: [{
        payload: outSdJwt
      }],
      presentation_submission: {
        id: String(Math.floor(Math.random() * 10000)),
        definition_id: definition.presentation_definition.id,
        descriptor_map: [
          {
            id: "thing_description_credential",
            format: "sd_jwt_vc",
            path: "$.verifiable_credential[0]"
          }
        ]
      },
      body: {
        method: "TDDRegistration",
        types: ["saref:LightSwitch", "saref:Light", "saref:LightingDevice"]
      }
    }

    // Send DIDMessage
    const body = await messageClient.createMessage(DIDReceiver, obj)
    const response2 = await instance.post(url, body, {
      headers: {
        'Content-Type': 'application/didcomm-encrypted+json'
      },
    });
    console.log('Step 2 response:', response2.data);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

const tddDID = "did:web:phamkv.github.io:service:discovery"
await registerThing('https://localhost:3000/', tddDID);
startThingExample();