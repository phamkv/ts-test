import express from 'express'
import bodyParser from "body-parser"
import jp from "jsonpath"
import { MessageClient } from "../utils/comm/commMessage.js";
import { TDD_SECRETS } from "../utils/comm/test-vectors.js";
import { verifySdJwt } from '../utils/sd-jwt/verify-sd-jwt.js';
import { resolvePublicKeyWeb } from '../utils/comm/didweb.js';

function parseJwt (token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
}

const tdStorage = [] // Simple array storage for demo

const DIDSender = "did:web:phamkv.github.io:service:discovery"
const messageClient = new MessageClient(DIDSender, TDD_SECRETS)

const app = express();
const port = 3000;

app.use(express.json());
app.use(bodyParser.text({ type: 'application/didcomm-encrypted+json' }));
app.use(bodyParser.json({ type: 'discover-features/query' }));

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

// Presentation Request for Registration
app.get('/registration', (req, res) => {
  res.send("definition")
});

const verifyCredential = async (encryptedMessage, jspath) => {
  try {
    // Handle Registration (sd-jwt verification and storing)
    const msg = await messageClient.unpackMessage(encryptedMessage)
    console.log(msg)
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

    for (let path of jspath) {
      try {
        if (jp.query(cred, path).length < 1 ) {
          res.send("Credential does not have the required attributes")
          return
        }
      } catch (error) {
        console.log(error)
        res.send(error)
        return
      }
    }
    return { cred, msg }
  } catch (error) {
    throw error
  }
}

// DIDComm Presentation Submission for Registration
app.post('/registration', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, async (req, res) => {
  try {
    const jspath = [
      "$.jwt.iss",
      "$.disclosed.id",
      "$.disclosed.title",
      "$.disclosed['@type']",
      "$.disclosed.security"
    ]
    const { cred, msg } = await verifyCredential(req.body, jspath)
    console.log(cred)
    console.log(msg)
    // Credential verified and valid according to the presentation definition
    // Registration will be processed now
    const thingDescription = {
      iss: cred.jwt.iss,
      ...cred.disclosed
    }

    res.send(thingDescription)
  } catch (error) {
    console.log(error)
    res.send(error)
  }
});

// Presentation Request for TD Query
app.get('/query', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.send("definition")
  next();
}, async (req, res) => {
  // Handle Query Request (sd-jwt verification and querying)
  const jspath = [
    "$.jwt.iss",
    "$.disclosed.id"
  ]
  const { cred, msg } = await verifyCredential(req.body, jspath)
  console.log(cred)


  res.send("Hallo")
});

app.listen(port, () => {
  console.log(`Thing Description Directory is listening at http://localhost:${port}`);
});