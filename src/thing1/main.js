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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.resolve(__filename, "..");

const sdJwt = fs.readFileSync(path.resolve(__dirname, "sd-jwt-test.json"), 'utf8');

const durationArray = []

async function registerThing(url, DIDReceiver) {
  try {
    perf_hooks.performance.mark('start');
    // Step 1: Make the first request and await its response
    const response1 = await instance.get(url + "TDDRegistration");
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
    }) // ["id", "title", "@type", "security"]
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
    console.log(obj)

    // Send DIDMessage
    const body = await messageClient.createMessage(DIDReceiver, obj)
    console.log(body)
    const response2 = await instance.post(url, body, {
      headers: {
        'Content-Type': 'application/didcomm-encrypted+json'
      },
    });
    perf_hooks.performance.mark('end');
    const duration = perf_hooks.performance.measure("Registration Thing1", 'start', 'end');
    durationArray.push(duration)
    console.log('Step 2 response:', response2.data);
    return response2
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

app.get("/registrationDemo", async (req, res) => {
  // Consume TD and send test request to Thing1
  const tddDID = "did:web:phamkv.github.io:service:discovery"
  const response = await registerThing('https://localhost:3000/', tddDID);
  // outputMeasurement()
  printSteps()
  res.send("Please look into the console")
});

app.listen(port, async () => {
  console.log(`Thing1 is listening at http://localhost:${port}`);
  await startThingExample();
  printSteps();
});

const printSteps = () => {
  console.log("======Execute the demo by sending the follwing RPCs=======")
  console.log(`http://localhost:${port}/registrationDemo`);
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