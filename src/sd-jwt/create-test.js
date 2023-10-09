
import { createSdJwtFile } from './create-sd-jwt.js'
import { Log, LOG_LEVEL } from './utils.js';
import fs from "fs"

const privateJWK = "src/comm/test/private1.json" // path
const jwt = "src/sd-jwt/examples/jwt2.json" // demo path
const hashAlg = "sha-256";
const sdClaims = "src/sd-jwt/examples/sdClaimsFlat2.json" // demo path
const outPath = "sd-jwt-test.json" // path not needed

void (async () => {
  try {
      const sdJwt = await createSdJwtFile(privateJWK, jwt, hashAlg, sdClaims);
      fs.writeFileSync(outPath, sdJwt);
      Log(`SD-JWT written to ${outPath}`, LOG_LEVEL.INFO);
  } catch (err) {
      Log(err, LOG_LEVEL.ERROR);
  }
})();
// npm run create-sd-jwt -- -k private.json -t examples/jwt.json -c examples/sdClaimsFlat.json -o sd-jwt.json