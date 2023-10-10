import { MessageClient } from "../utils/comm/commMessage.js";
import { THING1_SECRETS } from "../utils/comm/test-vectors.js";

const DIDSender = "did:web:phamkv.github.io:things:thing1"
const DIDReceiver = "did:web:phamkv.github.io:things:thing2"

const obj = {
  boy: "damn",
  bruh: {
    what: "dafuq"
  },
}

const messageClient = new MessageClient(DIDSender, THING1_SECRETS)
const msg = await messageClient.createMessage(DIDReceiver, obj)
console.log(msg)