import { discloseClaimsFiles } from './disclose-claims.js';

const sdJwt = "sd-jwt-test.json" // path optional (saved in storage)
const disclosedAttributes = "@context id title properties"
const outPath = "closed-jwt-test.json" // path optional (saved in storage)

void (async () => {
    try {
        // const outSdJwt = await discloseClaims(sdJwt, claims);
        await discloseClaimsFiles(sdJwt, disclosedAttributes, outPath);
    } catch (err) {
        console.log(err);
    }
})();