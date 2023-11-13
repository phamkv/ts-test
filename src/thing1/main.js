import express, { response } from 'express'
import fs from "fs"
import {fileURLToPath} from 'url';
import path from "path"
import axios from "axios";
import https from "https"
import { MessageClient } from "../utils/comm/commMessage.js";
import { THING1_SECRETS } from "../utils/comm/test-vectors.js";
import { discloseClaims } from "../utils/sd-jwt/disclose-claims.js";
import { startThingExample } from "../utils/wot/wot.js";
import * as winston from "winston"

const app = express();
const port = 4001;

// ONLY FOR DEMO / DEVELOPMENT PURPOSES
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const instance = axios.create({ httpsAgent })

const DIDSender = "did:web:phamkv.github.io:things:thing1"
const messageClient = new MessageClient(DIDSender, THING1_SECRETS)

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

async function registerThing(url, DIDReceiver) {
  try {
    perf_hooks.performance.mark('start');
    // Step 1: Make the first request and await its response
    logger.info("Step 1: Retrieving Presentation Definition...")
    const response1 = await instance.get(url + "TDDRegistration");
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
    logger.debug(claims) // ["id", "title", "@type", "security"]
    const outSdJwt = await discloseClaims(sdJwt, claims);
    const obj = {
      verifiable_credential: [{
        payload: outSdJwt
      }],
      presentation_submission: {
        id: String(Math.floor(Math.random() * 10000)),
        definition_id: definition.presentation_definition.id,
        descriptor_map: [
          {
            id: "thing_description_credential",
            format: "sd_jwt_vc",
            path: "$.verifiable_credential[0]"
          }
        ]
      },
      body: {
        method: "TDDRegistration",
        types: ["saref:LightSwitch", "saref:Light", "saref:LightingDevice"]
      }
    }
    logger.info("Step 2: Preparing DIDComm Message with Presentation Submission and attached Verifiable Credential...")
    logger.debug("The JWT in the VC payload can be decoded using this parser: https://sdjwt.info/")
    logger.info(obj)

    // Send DIDMessage
    logger.info("The encrypted DIDComm Message:")
    const body = await messageClient.createMessage(DIDReceiver, obj)
    logger.info(JSON.parse(body))
    logger.info("Step 2: Sending encrypted DIDComm Message through HTTPS to TD Directory...")
    const response2 = await instance.post(url, body, {
      headers: {
        'Content-Type': 'application/didcomm-encrypted+json'
      },
    });
    perf_hooks.performance.mark('end');
    const duration = perf_hooks.performance.measure("Registration Thing1", 'start', 'end');
    durationArray.push(duration)
    logger.debug(response2.data)
    logger.info('Step 2: Registration DIDComm successfully accepted by TD Directory');
    return response2
  } catch (error) {
    logger.error(error);
  }
}

app.get("/registrationDemo", async (req, res) => {
  // Consume TD and send test request to Thing1
  const tddDID = "did:web:phamkv.github.io:service:discovery"
  const response = await registerThing('https://localhost:3000/', tddDID);
  // outputMeasurement()
  setTimeout(() => {
    const prettyLog = generateLogs()
    res.send(prettyLog);
  }, 500)
});

app.listen(port, async () => {
  logger.debug(`Thing1 (RPC FUNCTIONS) is listening at http://localhost:${port}`);
  await startThingExample();
  printSteps();
});

const printSteps = () => {
  const hi = "Hallo"
  logger.info("======Execute the demo by sending the follwing RPCs=======")
  logger.info(`http://localhost:${port}/registrationDemo`);
}

const outputMeasurement = () => {
  const data = durationArray.map(pm => pm.duration).join("\n")

  fs.writeFile(path.resolve(__dirname, "output.txt"), data, (err) => {
    if (err) {
      logger.error('Error writing to file:', err);
    } else {
      logger.silly('Array has been written to the file.');
    }
  });
}

const generateLogs = () => {
  const log = fs.readFileSync(path.resolve(__dirname, "app.log"), 'utf-8');
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