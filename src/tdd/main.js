import express from 'express'
import bodyParser from "body-parser"
const app = express();
const port = 3000;

app.use(express.json());
app.use(bodyParser.json({ type: 'application/didcomm-encrypted+json' }));
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
app.get('/registration', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, (req, res) => {
  // Handle the POST request here
  res.send("Hallo")
});

// DIDComm Presentation Submission for Registration
app.post('/registration', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, (req, res) => {
  // Handle the POST request here
  res.send("Hallo")
});

// Presentation Request for TD Query
app.get('/query', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, (req, res) => {
  // Handle the POST request here
  res.send("Hallo")
});

// DIDComm Presentation Submission for TD Query
app.post('/query', (req, res, next) => {
  const contentType = req.headers['content-type'];
  if (contentType !== 'application/didcomm-encrypted+json')
    return res.status(415).send('Unsupported Media Type');
  next();
}, (req, res) => {
  // Handle the POST request here
  res.send("Hallo")
});

app.listen(port, () => {
  console.log(`Thing Description Directory is listening at http://localhost:${port}`);
});
