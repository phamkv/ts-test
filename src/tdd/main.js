import express from 'express'
import axios from 'axios'
import https from "https"
import bodyParser from "body-parser"
import jp from "jsonpath"
import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"
import * as winston from "winston"
import { MessageClient } from "../utils/comm/commMessage.js";
import { TDD_SECRETS } from "../utils/comm/test-vectors.js";
import { verifySdJwt } from '../utils/sd-jwt/verify-sd-jwt.js';
import { resolvePublicKeyWeb } from '../utils/comm/didweb.js';
import { statusListBaseToBitArray, getStatusCode } from '../utils/statusList.js'
import * as sm from "express-status-monitor"
const statusMonitor = sm.default()

const app = express();
const httpsApp = express();
httpsApp.use(express.json());
httpsApp.use(bodyParser.text({ type: 'application/didcomm-encrypted+json' }));

const port = 3005;
app.use(statusMonitor);
app.use(express.json());
app.use(bodyParser.text({ type: 'application/didcomm-encrypted+json' }));
app.use(bodyParser.json({ type: 'discover-features/query' }));

// ONLY FOR DEMO / DEVELOPMENT PURPOSES
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const instance = axios.create({ httpsAgent, validateStatus: function (status) {
  return status < 500;
}})

const DIDSender = "did:web:phamkv.github.io:service:discovery"
const messageClient = new MessageClient(DIDSender, TDD_SECRETS)

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
const server = https.createServer({key: key, cert: cert }, httpsApp);

let logger = winston.createLogger({
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

const outgoing = process.env.TDD || "localhost"
const thing2 = process.env.THING2 || "localhost"
const issuer1 = process.env.ISS1 || "localhost"

// DIDComm Presentation Submission for Registration
httpsApp.post('/', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, async (req, res) => {
  try {
    clearLog()
    logger.debug("===========================================")
    logger.info("Received incoming DIDComm Message")
    perf_hooks.performance.mark('start');
    const unpacked = await verifyCredential(req.body)
    logger.info("VC is successfully verified, processing Message...")
    // Credential verified and valid according to the presentation definition
    processMessage(unpacked, res)
    perf_hooks.performance.mark('end');
    const duration = perf_hooks.performance.measure(unpacked.msg.body.method, 'start', 'end');
    // durationArray.push(duration)
  } catch (error) {
    logger.error(error)
    res.status(403).send(error)
  }
});

// Presentation Request for Registration
httpsApp.get('/TDDRegistration', (req, res) => {
  const sdJwt = fs.readFileSync(path.resolve(__dirname, "registration_presentation_definition.json"), 'utf8');
  res.send(sdJwt)
});


// Presentation Request for TD Query
httpsApp.get('/TDDQuery', (req, res, next) => {
  const sdJwt = fs.readFileSync(path.resolve(__dirname, "query_presentation_definition.json"), 'utf8');
  res.send(sdJwt)
});

app.get('/', (req, res) => {
  const prettyLog = generateLogs("app.log")
  res.send(prettyLog);
})

app.get('/error', (req, res) => {
  const prettyLog = generateLogs("error.log")
  res.send(prettyLog);
})

app.get('/status', statusMonitor.pageRoute)

app.get('/memoryCapture', (req, res) => {
  res.send(process.memoryUsage())
  // outputMeasurement()
})

server.listen(3000, () => {
  logger.debug(`Thing Description Directory is listening at https://${outgoing}:${port}`);
});

app.listen(port, async () => {
  console.log(`TDD (RPC FUNCTIONS) is listening at http://localhost:${port}`);
  logger.debug(`TDD (RPC FUNCTIONS) is listening at http://localhost:${port}`);
});

// Functions

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

const deleteThing = (thingId, issuer) => { // stub for deletion
  if (tdStorage[thingId]) {
    if (tdStorage[thingId].iss !== issuer) {
      logger.info("Deleting Thing does not belong to the corresponding Issuer")
    }
    logger.info(`Deleting ${thingId}...`)
    delete tdStorage[thingId]
  }
}

const verifyStatus = async (cred) => {
  const uri = cred.jwt.status.uri.replace('localhost', issuer1);
  const response = await instance.get(uri)
  const statusListJwt = parseJwt(response.data)
  logger.debug("Status List Token:")
  logger.debug(statusListJwt)
  const { bits, lst } = statusListJwt.status_list
  const bitArray = statusListBaseToBitArray(lst)
  const statusCode = getStatusCode(bitArray, cred.jwt.status.idx, bits)
  logger.debug("Status Code of VC is:")
  logger.debug(statusCode)
  if (statusCode === 0) {
    logger.info("Credential Status valid")
    return true
  } else if (statusCode === 1) {
    logger.info("Credential Status revoked")
    return false
  } else {
    return true // further cases can be handled here
  }
}

const verifyCredential = async (encryptedMessage) => {
  try {
    // Handle Registration (sd-jwt verification and storing)
    const msg = await messageClient.unpackMessage(encryptedMessage)
    logger.info("Reading in DIDComm Message...")
    logger.debug(msg)
    const presentationSubmission = msg.presentation_submission
    if (!presentationSubmission && msg.body.method === "TDDDeletion") {
      logger.info("Deletion Request received, skipping verifying of VC...")
      return {
        cred: {},
        msg: msg
      }
    }

    perf_hooks.performance.mark('vc_start');
    const verfiableCredentials = presentationSubmission.descriptor_map.map(vc => jp.query(msg, vc.path)[0])
    const sdJwt = verfiableCredentials[0].payload

    logger.info("Veriyfing SD-JWT credential...")
    const raw = parseJwt(sdJwt)
    logger.debug(raw)
    logger.debug("Resolving Issuer's public key from DID")
    const jwksBytes = await resolvePublicKeyWeb(raw.iss)
    const rv = await verifySdJwt(sdJwt, jwksBytes)
    logger.info("SD-JWT signature is valid:")
    perf_hooks.performance.mark('vc_end');
    const vc_duration = perf_hooks.performance.measure("VC verification", 'vc_start', 'vc_end');
    durationArray.push(vc_duration)

    const cred = {
      jwt: JSON.parse(rv.jwt),
      disclosed: JSON.parse(rv.disclosed)
    }
    logger.info(cred)

    if (cred.jwt.status) {
      logger.info("VC contains Status List, checking status code...")
      perf_hooks.performance.mark('status_start');
      const status = await verifyStatus(cred)
      if (!status) {
        throw "Rejected: Credential Status is not valid!"
      } 
      perf_hooks.performance.mark('status_end');
      const duration = perf_hooks.performance.measure("Status Check", 'status_start', 'status_end');
    }
    
    logger.info("Checking if SD-JWT discloses claims needed as defined in the Presentation Definition...")
    let jspath
    if (msg.body.method === "TDDRegistration") {
      jspath = [
        "$.jwt.iss",
        "$.disclosed.id",
        "$.disclosed.title",
        "$.disclosed['@type']",
        "$.disclosed.security"
      ]
    } else if (msg.body.method === "TDDQuery") {
      jspath = [
        "$.jwt.iss",
        "$.disclosed.id"
      ]
    } else {
      jspath = []
    }

    logger.debug(jspath)
    for (let path of jspath) {
      try {
        if (jp.query(cred, path).length < 1 ) {
          throw "Rejected: Credential does not have the required attributes"
        }
      } catch (error) {
        logger.error(error)
        throw error
      }
    }
    logger.info("Checking if sender is actually Holder of VC...")
    if (cred.disclosed.id !== msg.from) {
      throw "Rejected: Sender is not Holder of VC"
    }
    logger.info("SD-JWT is valid")
    return { cred, msg }
  } catch (error) {
    throw error
  }
}

const processMessage = async (unpacked, res) => {
  const { cred, msg } = unpacked
  logger.info("Checking for type of request:")
  logger.debug(msg.body.method)
  try {
    if (msg.body.method === "TDDRegistration") {
      logger.info("Registering Thing:")
      const thingDescription = {
        iss: cred.jwt.iss,
        ...cred.disclosed
      }
      logger.debug(thingDescription)
      registerThing(thingDescription)
      res.sendStatus(202)
    } else if (msg.body.method === "TDDQuery") {
      logger.info("Querying the requested type of Things:")
      logger.info(msg.body["types"])
      const things = queryThings(msg.body["types"])
      const obj = {
        id: msg.id,
        body: {
          query: things
        }
      }
      logger.debug(obj)
    
      res.sendStatus(202)
      const sending = await messageClient.createMessage(msg.from, obj)
      const endpoint = `https://${thing2}:5002/`
      instance.post(endpoint, sending, {
        headers: {
          'content-type': 'application/didcomm-encrypted+json'
        },
      });
      logger.info("Sending DIDComm Message as response back to requesting Thing")
    } else if (msg.body.method === "TDDDeletion") {
      logger.info("Deleting entries of the following Things:")
      logger.info(msg.body.things)
      for (const thingId of msg.body.things) {
        deleteThing(thingId, msg.from)
      }
      res.sendStatus(202)
    } else {
      return
    }
  } catch(error) {
    throw error
  }
}

function parseJwt (token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
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
  const logEntries = log.trim().split('\n').map(line => {
    try {
      return JSON.parse(line);
    } catch (e) {
      console.error(`Error parsing line: ${line}`, e);
      return `Error parsing line: ${line}`; 
    }
  }).filter(entry => entry !== null);

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

const clearLog = () => {
  logger = winston.createLogger({
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
}

/*
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
*/