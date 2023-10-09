import crypto from 'crypto';
import base64url from 'base64url';

const recipientPublicKeyJWK = {
  kty: "EC",
  x: "2i-r7PMXK9r9fvUcBDpB9P0LLjsiLZHKmgLrGOW6wg0",
  y: "84uUdh0RR7MhoDGO-6pKlHRjGLOB5z62QYI3GedOEU8",
  crv: "secp256k1",
  kid: "bZMbXJsSsCulRAUldmOfDKx8ykaFF_NPLuQIDkSUWjc",
  use: "sig",
  alg: "ES256K"
}

const recipientPrivateKeyJWK = {
  kty: "EC",
  x: "2i-r7PMXK9r9fvUcBDpB9P0LLjsiLZHKmgLrGOW6wg0",
  y: "84uUdh0RR7MhoDGO-6pKlHRjGLOB5z62QYI3GedOEU8",
  crv: "secp256k1",
  d: "5UyZnZDArHNEAltbFRZ8KML9T3Vata9Juzcw0Sgv9Ac",
  kid: "bZMbXJsSsCulRAUldmOfDKx8ykaFF_NPLuQIDkSUWjc",
  use: "sig",
  alg: "ES256K"
}

const recipientPublicKeyECDH = crypto.createECDH(recipientPublicKeyJWK.crv);
recipientPublicKeyECDH.setPublicKey(Buffer.concat([
  Buffer.from([0x04]), // Indicates that the key is in uncompressed format
  base64url.toBuffer(recipientPublicKeyJWK.x),
  base64url.toBuffer(recipientPublicKeyJWK.y)
]));

// Generate an ephemeral key pair
const ephemeralECDH = crypto.createECDH(recipientPublicKeyJWK.crv);
ephemeralECDH.generateKeys();

// Compute the shared secret
const sharedSecret = ephemeralECDH.computeSecret(recipientPublicKeyECDH.getPublicKey());

// Encrypt the message with the shared secret
const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', sharedSecret, iv);

let encrypted = cipher.update('Hello, world!', 'utf8', 'hex');
encrypted += cipher.final('hex');

// The encrypted message and the ephemeral public key are sent to the recipient
const messageToRecipient = {
  encrypted,
  ephemeralPublicKey: ephemeralECDH.getPublicKey()
};
console.log(messageToRecipient)

/////////////

const recipientPrivateKeyECDH = crypto.createECDH(recipientPrivateKeyJWK.crv);
recipientPrivateKeyECDH.setPrivateKey(Buffer.from(recipientPrivateKeyJWK.d, 'base64'));

// Compute the shared secret
const sharedSecret2 = recipientPrivateKeyECDH.computeSecret(messageToRecipient.ephemeralPublicKey);

// Decrypt the message with the shared secret
const decipher = crypto.createDecipheriv('aes-256-cbc', sharedSecret2, iv);

let decrypted = decipher.update(messageToRecipient.encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');

console.log(decrypted)