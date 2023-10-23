import express from 'express'
import axios from "axios";
import https from "https"
import bodyParser from "body-parser"
import jp from "jsonpath"
import fs from "fs"
import path from "path"
import {fileURLToPath} from 'url';
import { MessageClient } from "../utils/comm/commMessage.js";
import { ISS1_SECRETS } from "../utils/comm/test-vectors.js";
import { verifySdJwt } from '../utils/sd-jwt/verify-sd-jwt.js';
import { resolvePublicKeyWeb } from '../utils/comm/didweb.js';
import * as createSdJwt from "./create-sdjwt.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");
const outPath = path.resolve(__dirname, "../thing1/sd-jwt-test.json")

// ONLY FOR DEMO / DEVELOPMENT PURPOSES
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const instance = axios.create({ httpsAgent })

const app = express();
const port = 4000;
app.use(express.json());
app.use(bodyParser.text({ type: 'application/didcomm-encrypted+json' }));
app.use(bodyParser.json({ type: 'discover-features/query' }));
// HTTPS Cert
const key = fs.readFileSync(path.resolve(__dirname, "./key.pem"));
const cert = fs.readFileSync(path.resolve(__dirname, "./cert.pem"));
const server = https.createServer({key: key, cert: cert }, app);

const DIDSender = "did:web:phamkv.github.io:issuer:manufacturer1"
const messageClient = new MessageClient(DIDSender, ISS1_SECRETS)

if (!fs.existsSync(outPath)) {
  createSdJwt.main(outPath)
}

function parseJwt (token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const tdStorage = {
  "did:web:phamkv.github.io:things:thing1": {
    "@context": "https://www.w3.org/2022/wot/td/v1.1",
    "@type": "saref:LightSwitch",
    "id": "did:web:phamkv.github.io:things:thing1",
    "title": "MyLampThing",
    "securityDefinitions": {
        "nosec_sc": {"scheme": "nosec"}
    },
    "security": "nosec_sc",
    "properties": {
        "status": {
            "type": "string",
            "forms": [{"href": "http://localhost:8080/lightswitch/properties/status"}]
        }
    },
    "actions": {
        "toggle": {
            "forms": [{"href": "http://localhost:8080/lightswitch/actions/toggle"}]
        }
    },
    "events": {}
  }
} // Simple hashmap storage for demo

const retrieveThingDescriptions = async (dids) => { // stub for retrieving
  const result = [];
  for (const did of dids) {
    result.push(tdStorage[did])
  }
  return result;
}

const verifyCredential = async (encryptedMessage) => {
  try {
    // Handle Registration (sd-jwt verification and storing)
    const msg = await messageClient.unpackMessage(encryptedMessage)
    // console.log(msg)
    const presentationSubmission = msg.presentation_submission
    const verfiableCredentials = presentationSubmission.descriptor_map.map(vc => jp.query(msg, vc.path)[0])
    // console.log(verfiableCredentials)
    const sdJwt = verfiableCredentials[0].payload

    const jwksBytes = await resolvePublicKeyWeb(parseJwt(sdJwt).iss)

    const rv = await verifySdJwt(sdJwt, jwksBytes)
    const cred = {
      jwt: JSON.parse(rv.jwt),
      disclosed: JSON.parse(rv.disclosed)
    }

    let jspath
    if (msg.body.method === "IssuerRequest") {
      jspath = [
        "$.jwt.iss",
        "$.disclosed.id",
        "$.disclosed['@type']"
      ]
    } else {
      jspath = []
    }

    for (let path of jspath) {
      try {
        if (jp.query(cred, path).length < 1 ) {
          throw "Credential does not have the required attributes"
        }
      } catch (error) {
        console.log(error)
        throw error
      }
    }
    return { cred, msg }
  } catch (error) {
    throw error
  }
}

const processMessage = async (unpacked, res) => {
  const { cred, msg } = unpacked
  try {
    if (msg.body.method === "IssuerRequest") {
      const thingDescriptions = await retrieveThingDescriptions(msg.body.dids)
      const obj = {
        id: msg.id,
        body: {
          thingDescriptions: thingDescriptions
        }
      }
      res.sendStatus(202) // Succesfully Verified

      const sending = await messageClient.createMessage(msg.from, obj)
      const endpoint = "https://localhost:4001/"
      instance.post(endpoint, sending, {
        headers: {
          'content-type': 'application/didcomm-encrypted+json'
        },
      });
    } else {
      return
    }
  } catch(error) {
    res.sendStatus(500)
  }
}

// Presentation Request for Registration
app.get('/IssuerRequest', (req, res) => {
  const sdJwt = fs.readFileSync(path.resolve(__dirname, "thingDescription_presentation_definition.json"), 'utf8');
  res.send(sdJwt)
});

// DIDComm Presentation Submission for Retrieval
app.post('/', (req, res, next) => {
  const contentType = req.headers['content-type'];
  console.log(contentType)
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, async (req, res) => {
  try {
    const unpacked = await verifyCredential(req.body)
    // Credential verified and valid according to the presentation definition
    // Retrieval will be processed now
    processMessage(unpacked, res)
  } catch (error) {
    console.log(error)
    res.send(error)
  }
});

// Status List(s) of Issuer
app.get('/statuslists/:id', (req, res) => {
  const id = req.params.id;

  const sdJwt = fs.readFileSync(path.resolve(__dirname, "thingDescription_presentation_definition.json"), 'utf8');
  res.send(sdJwt)
});

server.listen(port, () => {
  console.log(`Thing Description Directory is listening at http://localhost:${port}`);
});

// TODO: Revocation and deletion of ThingInfo in TDD

// TODO: discovery features muss noch geklärt werden

// TODO: Design and Concept schreiben (partially, ergänzt mit Info, die on the fly noch aufkommen)

// TODO: Gedanken machen zur Evaluation (ein/zwei Tage)

app.get('/', (req, res) => {
  const contentType = req.headers['content-type'];
  console.log(contentType)
  if (contentType === 'discover-features/query') {
    console.log(req.body)
    if (req.body.type !== "https://didcomm.org/discover-features/2.0/queries")
      return res.status(415).send('Unsupported Protocol')

      // logic for selective disclosure could be implemented here
      const data = {
        "type": "https://didcomm.org/discover-features/2.0/disclose",
        "thid": req.body.id,
        "body":{
            "disclosures": [
              {
                "feature-type": "protocol",
                "id": "https://identity.foundation/presentation-exchange/spec/v2.0.0",
                "roles": ["verifier"]
              },
              {
                "feature-type": "goal-code",
                "id": "wot.thing.description.registration",
                "request": ["/registration", "get"]
              },
              {
                "feature-type": "goal-code",
                "id": "wot.thing.description.query",
                "request": ["/query", "get"]
              }
            ]
        }
      }
      res.type("discover-features/disclose")
      res.send(data)
  } else {
    res.send("Hello World!")
  }
});