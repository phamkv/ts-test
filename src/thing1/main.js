import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"
import { MessageClient } from "../utils/comm/commMessage.js";
import { THING1_SECRETS } from "../utils/comm/test-vectors.js";
import { discloseClaims } from "../utils/sd-jwt/disclose-claims.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");

const DIDSender = "did:web:phamkv.github.io:things:thing1"
const DIDReceiver = "did:web:phamkv.github.io:service:discovery"
const sdJwt = fs.readFileSync(path.resolve(__dirname, "sd-jwt-test.json"), 'utf8');

const claims = "id title @type security" // this needs to be based on the presentation definition

const outSdJwt = await discloseClaims(sdJwt, claims);

const obj = {
  verifiable_credential: [{
    payload: outSdJwt
  }],
  presentation_submission: {
    id: String(Math.floor(Math.random() * 10000)),
    definition_id: "td_registration_definition",
    descriptor_map: [
      {
        id: "thing_description_credential",
        format: "sd_jwt_vc",
        path: "$.verifiable_credential[0]"
      }
    ]
  }
}

const messageClient = new MessageClient(DIDSender, THING1_SECRETS)
const msg = await messageClient.createMessage(DIDReceiver, obj)
console.log(msg)