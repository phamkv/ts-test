import didcomm from "didcomm"
const Message = didcomm.Message
import { resolveDIDWeb } from "./didweb.js"

class WebDIDResolver {
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

export class MessageClient {
  clientDID;
  didResolver;
  secretsResolver;

  constructor(clientDID, clientSecret) {
    this.clientDID = clientDID;
    this.didResolver = new WebDIDResolver();
    this.secretsResolver = new ExampleSecretsResolver(clientSecret);
  }

  async createMessage(recipientDID, message) {
    const msg = new Message({
      id: "1234567890",
      typ: "application/didcomm-plain+json",
      type: "http://example.com/protocols/lets_do_lunch/1.0/proposal",
      from: this.clientDID,
      to: [recipientDID],
      body: message,
    });

    const [encryptedMsg, encryptMetadata] = await msg.pack_encrypted(
      recipientDID,
      this.clientDID,
      null,
      this.didResolver,
      this.secretsResolver,
      {
        forward: false,
      }
    );
    console.log(encryptMetadata)
    return encryptedMsg
  }

  async unpackMessage(encryptedMsg) {
    const [unpackedMsg, unpackMetadata] = await Message.unpack(
      encryptedMsg,
      this.didResolver,
      this.secretsResolver,
      {}
    );
    console.log(unpackMetadata)
    return unpackedMsg.as_value()
  }

}

/*
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
let didResolver = new WebDIDResolver();
//let didResolver = new WebDIDResolver([THING1_DID_DOC, BOB_DID_DOC]);
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
*/