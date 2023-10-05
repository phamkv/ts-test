import fs from 'fs';
import * as jose from 'jose';
import { DisclosureArray, parseDisclosure } from './selective-disclosure.js';
import { Log, LOG_LEVEL } from './utils.js';

const discloseClaims = async (sdJwt, claims) => {
    // split SD-JWS into JWS and Disclosures
    const parts = sdJwt.split('~');
    if (parts.length <= 1) {
        throw new Error("No Disclosures found in SD-JWT");
    }
    const JWS = parts[0];
    let disclosures = parts.slice(1);
    disclosures = disclosures.filter(disclosure => claims.includes(parseDisclosure(disclosure)[DisclosureArray.NAME]));
    Log("updated disclosures: " + disclosures, LOG_LEVEL.DEBUG);

    // re-encode the updated SD-JWT w/ Disclosures
    const updatedSdJwt = JWS.concat("~" + disclosures.join("~"));
    return updatedSdJwt;
}

export const discloseClaimsFiles = async (sdjwtPath, claims, outPath) => {
    console.log(`Disclosing claims ${claims} from SD-JWT ${sdjwtPath}`);

    if (!fs.existsSync(sdjwtPath)) {
        throw new Error("File not found: " + sdjwtPath);
    }
    
    // read the SD-JWT payload
    const sdJwt = fs.readFileSync(sdjwtPath, 'utf8');

    // only disclose the specified claims
    const outSdJwt = await discloseClaims(sdJwt, claims);
    fs.writeFileSync(outPath, outSdJwt);
    console.log(`SD-JWT written to ${outPath}`);
}