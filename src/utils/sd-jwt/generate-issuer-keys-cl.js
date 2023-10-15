import { generateIssuerKeysFiles } from './generate-issuer-keys.js';

const privatePath = "tddPrivate.json"
const jwksPath = "tddJWKs.json"
const keyAlg = "ES256"

void (async () => {
    try {
        await generateIssuerKeysFiles(privatePath, jwksPath, keyAlg);
    } catch (err) {
        console.log(err);
    }
})();