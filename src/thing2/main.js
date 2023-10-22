import express from 'express'
import axios from "axios";
import https from "https"
import bodyParser from "body-parser"
import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"

import { MessageClient } from "../utils/comm/commMessage.js";
import { THING2_SECRETS } from "../utils/comm/test-vectors.js";
import { discloseClaims } from "../utils/sd-jwt/disclose-claims.js";
import { retrieveUrlFromTD, wotThingExample } from "../utils/wot/wot-client.js";

const app = express();
const port = 4001;
app.use(express.json());
app.use(bodyParser.text({ type: 'application/didcomm-encrypted+json' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");

// ONLY FOR DEMO / DEVELOPMENT PURPOSES
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const instance = axios.create({ httpsAgent })

// HTTPS Cert
const key = fs.readFileSync(path.resolve(__dirname, "./key.pem"));
const cert = fs.readFileSync(path.resolve(__dirname, "./cert.pem"));
const server = https.createServer({key: key, cert: cert }, app);

const DIDSender = "did:web:phamkv.github.io:things:thing2"
const sdJwt = fs.readFileSync(path.resolve(__dirname, "sd-jwt-test.json"), 'utf8');

const messageClient = new MessageClient(DIDSender, THING2_SECRETS)
const openRequests = {}

let thingDescriptionsTDD = []
let thingDescriptionsIssuer = []

async function queryProtocolPresentationExchange(DIDReceiver, serviceEndpoint, bodyPayload) {
  try {
    // Retrieve Presentation Definition (Protocol)
    const response1 = await instance.get(serviceEndpoint);
    const definition = response1.data;
    console.log('Step 1 response:', definition);

    // Set disclosed attributes according to definition
    const constraints = definition.presentation_definition.input_descriptors[0].constraints.fields[0].path
    console.log(constraints)
    const claims = constraints.filter(element => element.includes("$.disclosed")).map(str => {
      const parts = str.split('.')
      let propName = parts[parts.length - 1]
      if (propName.includes('[')) {
        propName = propName.replace(/[\[\]']/g, '')
        propName = propName.replace("disclosed", '')
      }
      return propName
    }) // ["id"]
    const outSdJwt = await discloseClaims(sdJwt, claims);
    const messageId = String(Math.floor(Math.random() * 10000))
    const obj = {
      id: messageId,
      verifiable_credential: [{
        payload: outSdJwt
      }],
      presentation_submission: {
        id: messageId,
        definition_id: definition.presentation_definition.id,
        descriptor_map: [
          {
            id: "thing_description_credential",
            format: "sd_jwt_vc",
            path: "$.verifiable_credential[0]"
          }
        ]
      },
      body: bodyPayload
    }
    openRequests[messageId] = bodyPayload

    // Send DIDMessage
    const bodyMessage = await messageClient.createMessage(DIDReceiver, obj)
    instance.post(serviceEndpoint, bodyMessage, {
      headers: {
        'content-type': 'application/didcomm-encrypted+json'
      },
    });
    // const msg = await messageClient.unpackMessage(JSON.stringify(response2.data))
    // console.log('Step 2 response:', msg);
    // return msg
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

const processMessage = async (msg) => {
  if (openRequests[msg.id].type === "TDD Request") {
    thingDescriptionsTDD = msg.body.query
    console.log(thingDescriptionsTDD)
  } else if (openRequests[msg.id].type === "Issuer Request") {
    thingDescriptionsIssuer = msg.body.thingDescriptions
    console.log(thingDescriptionsIssuer)
  } else {
    return ""
  }
}

// DIDComm Presentation Submission for Retrieval
app.post('/', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, async (req, res) => {
  try {
    const msg = await messageClient.unpackMessage(req.body)
    await processMessage(msg)
    res.sendStatus(202)
  } catch (error) {
    console.log(error)
    res.send(500).send(error)
  }
});

app.get("/queryDemo", (req, res) => {
  // Retrieve things matching the types from a Thing Description Discovery Service
  const payload1 = {
    type: "TDD Request",
    method: "queryThings",
    types: ["saref:LightSwitch", "saref:Light", "saref:LightingDevice"]
  }
  const tddDID = "did:web:phamkv.github.io:service:discovery"
  queryProtocolPresentationExchange(tddDID, 'https://localhost:3000/query', payload1)
  res.send("Step 1: Please look into the console")
});

app.get("/issuerRequestDemo", (req, res) => {
  // Retrieve full Thing Description from Issuer
  const thingInfo = {
    type: "Issuer Request",
    dids: [thingDescriptionsTDD[0].id]
  }
  const issuer1DID = "did:web:phamkv.github.io:issuer:manufacturer1"
  queryProtocolPresentationExchange(issuer1DID, 'https://localhost:4000/thingDescription', thingInfo)
  res.send("Step 2: Please look into the console")
});

app.get("/thingConsumptionDemo", async (req, res) => {
  // Consume TD and send test request to Thing1
  const thingDescription = thingDescriptionsIssuer[0]
  const thingUrl = retrieveUrlFromTD(thingDescription)
  wotThingExample(thingUrl)
  res.send("Step 3: Please look into the console")
});

server.listen(port, () => {
  console.log(`Thing Description Directory is listening at https://localhost:${port}`);
  console.log(`Step 1: https://localhost:${port}/queryDemo`);
  console.log(`Step 2: https://localhost:${port}/issuerRequestDemo`);
  console.log(`Step 3: https://localhost:${port}/thingConsumptionDemo`);
});

// TODO retrieving service endpoint from DIDDoc, then retrieving api endpoint using discover feature protocol