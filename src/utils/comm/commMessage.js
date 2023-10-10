import didcomm from "didcomm"
const Message = didcomm.Message
import { resolveDIDWeb } from "./didweb.js"
import { THING1_SECRETS, THING2_SECRETS } from "./test-vectors.js"

class ExampleDIDResolver {
  constructor() {
    console.log("")
  }

  async resolve(did) {
    const doc = await resolveDIDWeb(did)
    return doc
  }
}

class ExampleSecretsResolver {
  knownSecrets;

  constructor(knownSecrets) {
    this.knownSecrets = knownSecrets;
  }

  async get_secret(secretId) {
    return this.knownSecrets.find((secret) => secret.id === secretId) || null;
  }

  async find_secrets(secretIds) {
    return secretIds.filter((id) =>
      this.knownSecrets.find((secret) => secret.id === id)
    );
  }
}

const DIDSender = "did:web:phamkv.github.io:things:thing1"
const DIDReceiver = "did:web:phamkv.github.io:things:thing2"

const msg = new Message({
  id: "1234567890",
  typ: "application/didcomm-plain+json",
  type: "http://example.com/protocols/lets_do_lunch/1.0/proposal",
  from: DIDSender,
  to: [DIDReceiver],
  body: { messagespecificattribute: "and its value" },
});
console.log(msg)
// --- Packing encrypted and authenticated message ---
let didResolver = new ExampleDIDResolver();
//let didResolver = new ExampleDIDResolver([THING1_DID_DOC, BOB_DID_DOC]);
let secretsResolver = new ExampleSecretsResolver(THING1_SECRETS);

const [encryptedMsg, encryptMetadata] = await msg.pack_encrypted(
  DIDReceiver,
  DIDSender,
  DIDSender,
  didResolver,
  secretsResolver,
  {
    forward: false, // TODO: should be true by default
  }
);

console.log("Encryption metadata is\n", encryptMetadata);
// --- Sending message ---
console.log("Sending message\n", encryptedMsg);

secretsResolver = new ExampleSecretsResolver(THING2_SECRETS);

const [unpackedMsg, unpackMetadata] = await Message.unpack(
  encryptedMsg,
  didResolver,
  secretsResolver,
  {}
);

console.log("Reveived message is\n", unpackedMsg.as_value());
console.log("Reveived message unpack metadata is\n", unpackMetadata);