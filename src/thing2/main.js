import express, { response } from 'express'
import axios from "axios";
import https from "https"
import bodyParser from "body-parser"
import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"
import * as winston from "winston"

import { MessageClient } from "../utils/comm/commMessage.js";
import { THING2_SECRETS } from "../utils/comm/test-vectors.js";
import { discloseClaims } from "../utils/sd-jwt/disclose-claims.js";
import { retrieveUrlFromTD, wotThingExample } from "../utils/wot/wot-client.js";

const app = express();
const httpsApp = express();
const port = 4002;
app.use(express.json());
httpsApp.use(express.json());
httpsApp.use(bodyParser.text({ type: 'application/didcomm-encrypted+json' }));

// ONLY FOR DEMO / DEVELOPMENT PURPOSES
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const instance = axios.create({ httpsAgent })

const DIDSender = "did:web:phamkv.github.io:things:thing2"
const messageClient = new MessageClient(DIDSender, THING2_SECRETS)

// Create a PerformanceObserver to collect performance entries
import perf_hooks from "perf_hooks"
const observer = new perf_hooks.PerformanceObserver((list) => {
  const entries = list.getEntries();
  entries.forEach((entry) => {
    console.log(entry);
  });
});
observer.observe({ entryTypes: ["measure"], buffer: true })
const durationArray = []

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");
// HTTPS Cert
const key = fs.readFileSync(path.resolve(__dirname, "./key.pem"));
const cert = fs.readFileSync(path.resolve(__dirname, "./cert.pem"));
const httpsServer = https.createServer({ key: key, cert: cert }, httpsApp);

const sdJwt = fs.readFileSync(path.resolve(__dirname, "sd-jwt-test.json"), 'utf8');

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.resolve(__dirname, "error.log"), level: "warn" }),
    new winston.transports.File({ filename: path.resolve(__dirname, "app.log"), options: { flags: 'w' }}),
  ],
});

const sLogger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.resolve(__dirname, "misc.log"), options: { flags: 'w' }}),
  ],
});

const openRequests = {}
let thingDescriptionsTDD = []
let thingDescriptionsIssuer = []

httpsApp.post('/', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, async (req, res) => {
  try {
    logger.info("Received incoming DIDComm Message...")
    perf_hooks.performance.mark('rep_start');
    const msg = await messageClient.unpackMessage(req.body)
    perf_hooks.performance.mark('rep_end');
    await processMessage(msg)
    // outputMeasurement()
    res.sendStatus(202)
  } catch (error) {
    logger.error(error)
    res.send(500).send(error)
  }
});

// RPC Function for Demo
app.get("/queryDemo", (req, res) => {
  logger.info("Retrieving things matching the types from a Thing Description Discovery Service")
  const payload1 = {
    method: "TDDQuery",
    types: ["saref:LightSwitch", "saref:Light", "saref:LightingDevice"]
  }
  logger.debug("Payload to be sent to the TD Directory:")
  logger.debug(payload1)
  const tddDID = "did:web:phamkv.github.io:service:discovery"
  logger.debug(tddDID)
  queryProtocolPresentationExchange(tddDID, 'https://localhost:3000/', payload1)
  setTimeout(() => {
    const prettyLog = generateLogs("app.log")
    res.send(prettyLog);
  }, 1000)
});

// RPC Function for Demo
app.get("/issuerRequestDemo", (req, res) => {
  // Retrieve full Thing Description from Issuer
  sLogger.info("Doing similiar work (creating DIDComm Message) to authenticate to Issuer1 for requesting TD of Thing1...")
  const thingInfo = {
    method: "IssuerRequest",
    dids: [thingDescriptionsTDD[0].id]
  }
  sLogger.info("Payload to be sent to the Manufacturer (Issuer1):")
  sLogger.info(thingInfo)
  const issuer1DID = "did:web:phamkv.github.io:issuer:manufacturer1"
  sLogger.debug(issuer1DID)
  queryProtocolPresentationExchange(issuer1DID, 'https://localhost:4000/', thingInfo)
  setTimeout(() => {
    const prettyLog = generateLogs("misc.log")
    res.send(prettyLog);
  }, 1000)
});

app.get("/thingConsumptionDemo", async (req, res) => {
  // Consume TD and send test request to Thing1
  const thingDescription = thingDescriptionsIssuer[0]
  const thingUrl = retrieveUrlFromTD(thingDescription)
  await wotThingExample(thingUrl)
  printSteps()
  res.send("Please look into the console of Thing2")
});

// RPC Function for Demo
app.get("/tddStressTest", async (req, res) => {
  // Retrieve things matching the types from a Thing Description Discovery Service
  const response = await instance.get('https://localhost:3000/memoryCapture');  
  console.log(response.data)

  delayedLoop(3)

  setTimeout(async function (){ 
    const response = await instance.get('https://localhost:3000/memoryCapture'); 
    console.log(response.data)
  }, 15000)
  res.send("TDD Query Stress Test: Please look into the console")
});

httpsServer.listen(5002, () => {
  logger.debug(`Thing2 is listening at https://localhost:5002`);
});

app.listen(port, async () => {
  logger.debug(`Thing2 (RPC FUNCTIONS) is listening at http://localhost:${port}`);
  printSteps();
});

async function queryProtocolPresentationExchange(DIDReceiver, serviceEndpoint, bodyPayload) {
  try {
    perf_hooks.performance.mark('start');
    // Retrieve Presentation Definition (Protocol)
    perf_hooks.performance.mark('def_start');
    logger.info("Step 1: Retrieving Presentation Definition...")
    const response1 = await instance.get(serviceEndpoint + bodyPayload.method);
    const definition = response1.data;
    logger.info('Step 1 response:');
    logger.info(definition)

    // Set disclosed attributes according to definition
    const constraints = definition.presentation_definition.input_descriptors[0].constraints.fields[0].path
    const claims = constraints.filter(element => element.includes("$.disclosed")).map(str => {
      const parts = str.split('.')
      let propName = parts[parts.length - 1]
      if (propName.includes('[')) {
        propName = propName.replace(/[\[\]']/g, '')
        propName = propName.replace("disclosed", '')
      }
      return propName
    }) 
    logger.debug("Disclosing the following claims as per Presentation Definition:")
    logger.debug(claims) // ["id"]
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
    logger.debug("Storing request for future processing:")
    openRequests[messageId] = bodyPayload
    logger.debug(openRequests)
    perf_hooks.performance.mark('def_end');
    logger.info("Step 2: Preparing DIDComm Message with Presentation Submission and attached Verifiable Credential...")
    logger.debug("The JWT in the VC payload can be decoded using this parser: https://sdjwt.info/")
    logger.info(obj)


    // Send DIDMessage
    logger.info("The encrypted DIDComm Message:")
    perf_hooks.performance.mark('msg_start');
    const bodyMessage = await messageClient.createMessage(DIDReceiver, obj)
    perf_hooks.performance.mark('msg_end');
    logger.info(JSON.parse(bodyMessage))
    logger.info("Step 2: Sending encrypted DIDComm Message through HTTPS to TD Directory...")
    instance.post(serviceEndpoint, bodyMessage, {
      headers: {
        'content-type': 'application/didcomm-encrypted+json'
      },
    });
    // logger.debug(response2.data)
    logger.info('Step 2: Registration DIDComm successfully accepted by TD Directory')
    return
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

// Process incoming DIDComm Messages (e.g. response from TD Directory)
const processMessage = async (msg) => {
  logger.info("Step 3: The decrypted DIDComm Message:")
  logger.info(msg)
  const msg_duration = perf_hooks.performance.measure('Message Encryption', 'msg_start', 'msg_end');
  const rep_duration = perf_hooks.performance.measure('Message Unpack', 'rep_start', 'rep_end');
  const def_duration = perf_hooks.performance.measure('Presentation Definition', 'def_start', 'def_end');
  // durationArray.push(rep_duration)
  logger.debug("Retrieving request context from message id:")
  logger.debug(msg.id)
  logger.debug(openRequests)
  if (openRequests[msg.id].method === "TDDQuery") {
    logger.info("Message is response to a TDDQuery request")
    perf_hooks.performance.mark('query_end');
    logger.info("Step 3: The query result:")
    thingDescriptionsTDD = msg.body.query
    logger.info(thingDescriptionsTDD)
    const duration = perf_hooks.performance.measure('TDDQuery', 'start', 'query_end');
    durationArray.push(duration)
  } else if (openRequests[msg.id].method === "IssuerRequest") {
    sLogger.info("Message is response to a IssuerRequest request")
    perf_hooks.performance.mark('issuer_end');
    thingDescriptionsIssuer = msg.body.thingDescriptions
    sLogger.info(thingDescriptionsIssuer)
    perf_hooks.performance.measure('IssuerRequest', 'start', 'issuer_end');
  } else {
    return ""
  }
  setTimeout(function (){
    printSteps()           
  }, 1500)
}

const printSteps = () => {
  logger.info("======Execute the demo by sending the follwing RPCs=======")
  logger.info(`Step 1: http://localhost:${port}/queryDemo`);
  logger.info(`Step 2: http://localhost:${port}/issuerRequestDemo`);
  logger.info(`Step 3: http://localhost:${port}/thingConsumptionDemo`);
}

// For testing only
async function delayedLoop(iterations) {
  let i = 0;

  const response = await instance.get('https://localhost:3000/memoryCapture');  
  console.log(response.data)
  const payload1 = {
    method: "TDDQuery",
    types: ["saref:LightSwitch", "saref:Light", "saref:LightingDevice"]
  }
  const tddDID = "did:web:phamkv.github.io:service:discovery"

  async function loop() {
    if (i < iterations) {
      for (let j = 0; j < 50; j++) {
        queryProtocolPresentationExchange(tddDID, 'https://localhost:3000/', payload1)
      }
      i++;
      // Call the loop function again after a 1-second delay
      setTimeout(loop, 3000); // 1000 milliseconds = 1 second
    }
  }

  // Start the loop
  loop();
}

const outputMeasurement = () => {
  const data = durationArray.map(pm => pm.duration).join("\n")

  fs.writeFile(path.resolve(__dirname, "output.txt"), data, (err) => {
    if (err) {
      console.error('Error writing to file:', err);
    } else {
      console.log('Array has been written to the file.');
    }
  });
}

const generateLogs = (filename) => {
  const log = fs.readFileSync(path.resolve(__dirname, filename), 'utf-8');
  const logEntries = log.trim().split('\n').map(line => JSON.parse(line));
  // Convert log entries to a pretty format
  const prettyLog = logEntries.map(entry => {
    let message = entry.message;
    // Check if the message is an object and stringify it if so
    if (message && typeof message === 'object') {
        message = '<pre>' + JSON.stringify(message, null, 2) + '</pre>';
    }
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${message}`;
  }).join('<br>');
  return cssStyles + '<pre>' + prettyLog + '</pre>'
}

const cssStyles = `
<style>
    body {
        font-family: Arial, sans-serif;
        line-height: 1.5;
    }
    pre {
        white-space: pre-wrap;       /* Since CSS 2.1 */
        white-space: -moz-pre-wrap;  /* Mozilla, since 1999 */
        white-space: -pre-wrap;      /* Opera 4-6 */
        white-space: -o-pre-wrap;    /* Opera 7 */
        word-wrap: break-word;       /* Internet Explorer 5.5+ */
    }
</style>
`;