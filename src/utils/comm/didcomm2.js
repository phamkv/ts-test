import crypto from 'crypto';
import base64url from 'base64url';

const publicJWK = {
  kty: "EC",
  x: "2i-r7PMXK9r9fvUcBDpB9P0LLjsiLZHKmgLrGOW6wg0",
  y: "84uUdh0RR7MhoDGO-6pKlHRjGLOB5z62QYI3GedOEU8",
  crv: "secp256k1",
  kid: "bZMbXJsSsCulRAUldmOfDKx8ykaFF_NPLuQIDkSUWjc",
  use: "sig",
  alg: "ES256K"
}

const privateJWK = {
  kty: "EC",
  x: "2i-r7PMXK9r9fvUcBDpB9P0LLjsiLZHKmgLrGOW6wg0",
  y: "84uUdh0RR7MhoDGO-6pKlHRjGLOB5z62QYI3GedOEU8",
  crv: "secp256k1",
  d: "5UyZnZDArHNEAltbFRZ8KML9T3Vata9Juzcw0Sgv9Ac",
  kid: "bZMbXJsSsCulRAUldmOfDKx8ykaFF_NPLuQIDkSUWjc",
  use: "sig",
  alg: "ES256K"
}

//console.log(crypto.getCurves())

const publicECDH = crypto.createECDH(publicJWK.crv);
publicECDH.setPublicKey(Buffer.concat([
  Buffer.from([0x04]), // Indicates that the key is in uncompressed format
  base64url.toBuffer(publicJWK.x),
  base64url.toBuffer(publicJWK.y)
]));
console.log(publicECDH)

const privateECDH = crypto.createECDH(privateJWK.crv);
privateECDH.setPrivateKey(Buffer.from(privateJWK.d, 'base64'));
privateECDH.setPublicKey(Buffer.concat([
  Buffer.from([0x04]), // Indicates that the key is in uncompressed format
  base64url.toBuffer(privateJWK.x),
  base64url.toBuffer(privateJWK.y)
]));


const sharedSecret = privateECDH.computeSecret(publicECDH.getPublicKey());
console.log(sharedSecret)

const iv = crypto.randomBytes(16);
const cipher = crypto.createCipheriv('aes-256-cbc', sharedSecret, iv);

let encrypted = cipher.update('Hello, world!', 'utf8', 'hex');
encrypted += cipher.final('hex');

console.log(encrypted)

const decipher = crypto.createDecipheriv('aes-256-cbc', sharedSecret, iv);

let decrypted = decipher.update(encrypted, 'hex', 'utf8');
decrypted += decipher.final('utf8');

console.log(decrypted)
