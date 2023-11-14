
import { createSdJwtFile } from './create-sd-jwt.js'
import { Log, LOG_LEVEL } from './utils.js';
import fs from "fs"

//const privateJWK = "src/utils/comm/test/private1.json" // path
const privateJWK = {
  kty: "EC",
  x: "8XOj4Vmb0mSPvzEPwjjOykTVMh8Kw-2jjJGWxu7WpNU",
  y: "7Z6mkWTlr4pL8jsgFezeRZqatVEcVnJH1WrRRCHlN64",
  crv: "secp256k1",
  d: "6U9BswiDQky6ffxbR-JhsHe_luEWt-m-6crjEm_0Q6I",
  kid: "Gxh-VPsN6tOak9mKJZqEVrtFjNpwXLkHrDV9HF4xGng",
  use: "sig",
  alg: "ES256K"
}
const jwt = "src/utils/sd-jwt/examples/jwt2.json" // demo path
const hashAlg = "sha-256";
const sdClaims = "src/utils/sd-jwt/examples/sdClaimsFlat2.json" // demo path
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