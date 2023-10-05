
import { createSdJwtFile } from './create-sd-jwt.js'
import { Log, LOG_LEVEL } from './utils.js';

const privateJWK = "src/comm/test/private1.json"
const jwt = "src/sd-jwt/examples/jwt2.json"
const hashAlg = "sha-256";
const sdClaims = "src/sd-jwt/examples/sdClaimsFlat2.json"
const outPath = "sd-jwt-test.json"

void (async () => {
  try {
      await createSdJwtFile(privateJWK, jwt, hashAlg, sdClaims, outPath);
  } catch (err) {
      Log(err, LOG_LEVEL.ERROR);
  }
})();
// npm run create-sd-jwt -- -k private.json -t examples/jwt.json -c examples/sdClaimsFlat.json -o sd-jwt.json