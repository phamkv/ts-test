import { verifySdJwt, verifySdJwtFile } from './verify-sd-jwt.js';
import { resolvePublicKeyWeb } from "../comm/didweb.js"
import fs from "fs"

/* interface Options {
    sdJwtPath: string;
    jwksPath: string;
    outJwtPath: string;
    outDisclosedPath: string;
} */

const sdJwt = "closed-jwt-test.json" // path not needed
const publicJWK = "src/comm/test/jwks1.json" // json needs to be retrived from resolver
const outJwt = "out-jwt.json" // path not needed
const outClaims = "out-claims.json" // path not needed

void (async () => {
    try {
        // await verifySdJwtFile(sdJwt, publicJWK, outJwt, outClaims);
        // read the SD-JWT payload
        const sdjwt = fs.readFileSync(sdJwt, 'utf8');
        const jwksBytes = await resolvePublicKeyWeb('did:web:phamkv.github.io:things:thing1')
        const rv = await verifySdJwt(sdjwt, jwksBytes)
        console.log(rv)
    } catch (err) {
        console.log(err);
    }
})();