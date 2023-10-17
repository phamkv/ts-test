import { createSdJwtFile } from '../utils/sd-jwt/create-sd-jwt.js'
import { Log, LOG_LEVEL } from '../utils/sd-jwt/utils.js';
import fs from "fs"
import path from "path"
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");

const privateJWK = path.join(__dirname, "../utils/comm/issuer1_keypair/issuer1Private.json") // path
const jwt = path.resolve(__dirname, "../utils/sd-jwt/examples/jwt2.json") // demo path
const hashAlg = "sha-256";
const sdClaims = path.resolve(__dirname, "../utils/sd-jwt/examples/sdClaimsFlat2.json") // demo path

export const main = async (outPath) => {
  try {
      const sdJwt = await createSdJwtFile(privateJWK, jwt, hashAlg, sdClaims);
      fs.writeFileSync(outPath, sdJwt);
      Log(`SD-JWT written to ${outPath}`, LOG_LEVEL.INFO);
  } catch (err) {
      Log(err, LOG_LEVEL.ERROR);
  }
}