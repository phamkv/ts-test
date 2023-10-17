import fs from "fs"
import path from "path"
import {fileURLToPath} from 'url';
import * as createSdJwt from "./create-sdjwt.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");
const outPath = path.resolve(__dirname, "../thing2/sd-jwt-test.json")

if (!fs.existsSync(outPath)) {
  createSdJwt.main(outPath)
}