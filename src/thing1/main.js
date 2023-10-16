import { MessageClient } from "../utils/comm/commMessage.js";
import { THING1_SECRETS } from "../utils/comm/test-vectors.js";

const DIDSender = "did:web:phamkv.github.io:things:thing1"
const DIDReceiver = "did:web:phamkv.github.io:service:discovery"

const obj = {
  verifiable_credential: ["damn"],
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