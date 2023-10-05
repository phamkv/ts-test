import { discloseClaimsFiles } from './disclose-claims.js';

const sdJwt = "sd-jwt-test.json"
const disclosedAttributes = "@context id title properties"
const outPath = "closed-jwt-test.json"

void (async () => {
    try {
        await discloseClaimsFiles(sdJwt, disclosedAttributes, outPath);
    } catch (err) {
        console.log(err);
    }
})();