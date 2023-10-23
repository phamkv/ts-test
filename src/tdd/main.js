import express from 'express'
import axios from 'axios'
import https from "https"
import bodyParser from "body-parser"
import jp from "jsonpath"
import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"
import { MessageClient } from "../utils/comm/commMessage.js";
import { TDD_SECRETS } from "../utils/comm/test-vectors.js";
import { verifySdJwt } from '../utils/sd-jwt/verify-sd-jwt.js';
import { resolvePublicKeyWeb } from '../utils/comm/didweb.js';
import { statusListBaseToBitArray, getStatusCode } from '../utils/statusList.js'

const app = express();
const port = 3000;

// ONLY FOR DEMO / DEVELOPMENT PURPOSES
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const instance = axios.create({ httpsAgent })

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");
// HTTPS Cert
const key = fs.readFileSync(path.resolve(__dirname, "./key.pem"));
const cert = fs.readFileSync(path.resolve(__dirname, "./cert.pem"));
const server = https.createServer({key: key, cert: cert }, app);

function parseJwt (token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const tdStorage = {} // Simple hashmap storage for demo
const registerThing = (thingDescription) => { // stub for storaging
  tdStorage[thingDescription.id] = thingDescription;
}

const queryThings = (types) => { // stub for querying
  const filteredThings = [];
  for (const key in tdStorage) {
    const thingDescription = tdStorage[key];
    if (types.includes(thingDescription["@type"])) {
      filteredThings.push(thingDescription);
    }
  }
  return filteredThings;
}

const deleteThing = (thingId) => { // stub for deletion
  if (tdStorage[thingId]) {
    console.log(`Deleting ${thingId}...`)
    delete tdStorage[thingId]
  }
}

const DIDSender = "did:web:phamkv.github.io:service:discovery"
const messageClient = new MessageClient(DIDSender, TDD_SECRETS)

app.use(express.json());
app.use(bodyParser.text({ type: 'application/didcomm-encrypted+json' }));
app.use(bodyParser.json({ type: 'discover-features/query' }));

const verifyStatus = async (cred) => {
  const uri = cred.jwt.status.uri
  const response = await instance.get(uri)
  const statusListJwt = parseJwt(response.data)

  const { bits, lst } = statusListJwt.status_list
  const bitArray = statusListBaseToBitArray(lst)
  const statusCode = getStatusCode(bitArray, cred.jwt.status.idx, bits)
  // console.log(statusCode)
  if (statusCode === 0) {
    console.log("Credential Status valid")
    return true
  } else if (statusCode === 1) {
    // console.log("Credential Status invalid")
    return false
  } else {
    return true // further cases can be handled here
  }
}

const verifyCredential = async (encryptedMessage) => {
  try {
    // Handle Registration (sd-jwt verification and storing)
    const msg = await messageClient.unpackMessage(encryptedMessage)
    // console.log(msg)
    const presentationSubmission = msg.presentation_submission
    console.log(presentationSubmission)
    console.log(msg)
    if (!presentationSubmission && msg.body.method === "TDDDeletion") {
      return {
        cred: {},
        msg: msg
      }
    }
    const verfiableCredentials = presentationSubmission.descriptor_map.map(vc => jp.query(msg, vc.path)[0])
    // console.log(verfiableCredentials)
    const sdJwt = verfiableCredentials[0].payload

    const jwksBytes = await resolvePublicKeyWeb(parseJwt(sdJwt).iss)

    const rv = await verifySdJwt(sdJwt, jwksBytes)
    const cred = {
      jwt: JSON.parse(rv.jwt),
      disclosed: JSON.parse(rv.disclosed)
    }

    if (cred.jwt.status) {
      const status = await verifyStatus(cred)
      if (!status) {
        throw "Credential Status is not valid!"
      } 
    }
    
    let jspath
    if (msg.body.method === "TDDRegistration") {
      jspath = [
        "$.jwt.iss",
        "$.disclosed.id",
        "$.disclosed.title",
        "$.disclosed['@type']",
        "$.disclosed.security"
        // TODO: revocation key
      ]
    } else if (msg.body.method === "TDDQuery") {
      jspath = [
        "$.jwt.iss",
        "$.disclosed.id"
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
    if (msg.body.method === "TDDRegistration") {
      const thingDescription = {
        iss: cred.jwt.iss,
        ...cred.disclosed
      }
      registerThing(thingDescription)
      res.sendStatus(202)
    } else if (msg.body.method === "TDDQuery") {
      const things = queryThings(msg.body["types"])
      const obj = {
        id: msg.id,
        body: {
          query: things
        }
      }
    
      res.sendStatus(202)
      const sending = await messageClient.createMessage(msg.from, obj)
      const endpoint = "https://localhost:4001/"
      instance.post(endpoint, sending, {
        headers: {
          'content-type': 'application/didcomm-encrypted+json'
        },
      });
    } else if (msg.body.method === "TDDDeletion") {
      for (const thingId of msg.body.things) {
        deleteThing(thingId)
      }
      res.sendStatus(202)
    } else {
      return
    }
  } catch(error) {
    throw error
  }
}

// DIDComm Presentation Submission for Registration
app.post('/', (req, res, next) => {
  const contentType = req.headers['content-type'];
  console.log(contentType)
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, async (req, res) => {
  try {
    // console.log(req)
    const unpacked = await verifyCredential(req.body)
    // console.log(cred)
    // console.log(msg)
    // Credential verified and valid according to the presentation definition
    // Registration will be processed now
    processMessage(unpacked, res)
  } catch (error) {
    console.log(error)
    res.status(406).send(error)
  }
});

// Presentation Request for Registration
app.get('/TDDRegistration', (req, res) => {
  const sdJwt = fs.readFileSync(path.resolve(__dirname, "registration_presentation_definition.json"), 'utf8');
  res.send(sdJwt)
});


// Presentation Request for TD Query
app.get('/TDDQuery', (req, res, next) => {
  const sdJwt = fs.readFileSync(path.resolve(__dirname, "query_presentation_definition.json"), 'utf8');
  res.send(sdJwt)
});

server.listen(port, () => {
  console.log(`Thing Description Directory is listening at https://localhost:${port}`);
});



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