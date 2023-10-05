import { verifySdJwtFile } from './verify-sd-jwt.js';

/* interface Options {
    sdJwtPath: string;
    jwksPath: string;
    outJwtPath: string;
    outDisclosedPath: string;
} */

const sdJwt = "closed-jwt-test.json"
const publicJWK = "src/comm/test/jwks1.json"
const outJwt = "out-jwt.json"
const outClaims = "out-claims.json"

void (async () => {
    try {
        await verifySdJwtFile(sdJwt, publicJWK, outJwt, outClaims);
    } catch (err) {
        console.log(err);
    }
})();