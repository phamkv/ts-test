import crypto from 'crypto';
import base64url from 'base64url';
import fs from 'fs';
import { resolvePublicKeyWeb } from "./didweb.js"

const iv = crypto.randomBytes(16);

export function encryptMessage(recipientPublicKeyJWK, message) {
  const publicKey = recipientPublicKeyJWK["keys"].find(key => key["crv"] === "secp256k1")
  if (publicKey === undefined) {
    return "Invalid keys"
  }

  const recipientPublicKeyECDH = crypto.createECDH(publicKey.crv);
  recipientPublicKeyECDH.setPublicKey(Buffer.concat([
    Buffer.from([0x04]), // Indicates that the key is in uncompressed format
    base64url.toBuffer(publicKey.x),
    base64url.toBuffer(publicKey.y)
  ]));

  // Generate an ephemeral key pair
  const ephemeralECDH = crypto.createECDH(publicKey.crv);
  ephemeralECDH.generateKeys();

  // Compute the shared secret
  const sharedSecret = ephemeralECDH.computeSecret(recipientPublicKeyECDH.getPublicKey());

  // Encrypt the message with the shared secret
  const cipher = crypto.createCipheriv('aes-256-cbc', sharedSecret, iv);

  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // The encrypted message and the ephemeral public key are sent to the recipient
  return {
    encrypted,
    ephemeralPublicKey: ephemeralECDH.getPublicKey()
  };
}

export function decryptMessage(recipientPrivateKeyJWK, message) {
  const recipientPrivateKeyECDH = crypto.createECDH(recipientPrivateKeyJWK.crv);
  recipientPrivateKeyECDH.setPrivateKey(Buffer.from(recipientPrivateKeyJWK.d, 'base64'));

  // Compute the shared secret
  const sharedSecret = recipientPrivateKeyECDH.computeSecret(message.ephemeralPublicKey);

  // Decrypt the message with the shared secret
  const decipher = crypto.createDecipheriv('aes-256-cbc', sharedSecret, iv);

  let decrypted = decipher.update(message.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted
}

/*
const thing2PublicKeyJWK = await resolvePublicKeyWeb("did:web:phamkv.github.io:things:thing2")

const messageToRecipient = encryptMessage(thing2PublicKeyJWK, "Hello World")
console.log(messageToRecipient)

/////////////

const privateJWKObj = fs.readFileSync("src/comm/test/private2.json", 'utf8');
const thing2PrivateKeyJWK = JSON.parse(privateJWKObj);

const decryptedMessage = decryptMessage(thing2PrivateKeyJWK, messageToRecipient)

console.log(decryptedMessage)
*/