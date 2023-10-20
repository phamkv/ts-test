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
const sdJwt = fs.readFileSync(path.resolve(__dirname, "sd-jwt-test.json"), 'utf8');

const messageClient = new MessageClient(DIDSender, THING2_SECRETS)

async function queryProtocolPresentationExchange(DIDReceiver, serviceEndpoint, bodyPayload) {
  try {
    // Retrieve Presentation Definition (Protocol)
    const response1 = await axios.get(serviceEndpoint);
    const definition = response1.data;
    console.log('Step 1 response:', definition); // TODO: work with definition

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
      body: bodyPayload
    }

    // Send DIDMessage
    const bodyMessage = await messageClient.createMessage(DIDReceiver, obj)
    const response2 = await axios.post(serviceEndpoint, bodyMessage, {
      headers: {
        'content-type': 'application/didcomm-encrypted+json'
      },
    });
    const msg = await messageClient.unpackMessage(JSON.stringify(response2.data))
    console.log('Step 2 response:', msg.body.query);
    return msg.body.query
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Retrieve things matching the types from a Thing Description Discovery Service
const payload1 = {
  types: ["saref:LightSwitch", "saref:Light", "saref:LightingDevice"]
}
const tddDID = "did:web:phamkv.github.io:service:discovery"
const things = await queryProtocolPresentationExchange(tddDID, 'http://localhost:3000/query', payload1);

// Retrieve full Thing Description from Issuer
const thingInfo = things[0]
const issuer1DID = "did:web:phamkv.github.io:issuer:manufacturer1"
// const thingDescription = await queryProtocolPresentationExchange(issuer1DID, 'http://localhost:4000/thingDescription', thingInfo)

// console.log(thingDescription)
// Consume TD and send test request to Thing1

// TODO retrieving service endpoint from DIDDoc, then retrieving api endpoint using discover feature protocol