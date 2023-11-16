# Secure WoT Discovery using DIDs and VCs

This demo implementation underlines the concept of the bachelor thesis. This project was developed in NodeJS with various libraries, modules, and implemented code. Made by Kevin Hai Nam Pham.

## Installation and Setup Instructions

Clone down this repository (or or use the .zip File).

You need NodeJS and npm installed globally on your machine.

Alternatively, you can run this demo on Docker Compose. You then need Docker installed globally on your machine.

### Using NodeJS

Go into the root folder and install by typing:

`npm install`

You need to run each actor used in this demo:

Run Issuer1: `node src/issuer1/main.js`

Run TD Directory: `node src/tdd/main.js`

Run Thing1: `node src/thing1/main.js`

Run Thing2: `node src/thing2/main.js`

### Using Docker

Build image:

`docker build -t pham_implementation:latest .`

Orchestrate actors with Docker Compose:

`docker-compose up -d`

Remove Demo:

`docker-compose down`

## Usage

The actors's functionalities are reached through Remote Procedure Call, meaning that they are executed by sending HTTP Get requests to them. Each call will give you information about the process (e.g. by logs or console).

- TD Directory
  - http://localhost:3005/ - See the logs of TD Directory (refresh this page after each request)
- Thing1
  - http://localhost:4001/revokedStatusDemo - Send a registration request with a revoked SD-JWT
  - http://localhost:4001/wrongHolderVCDemo - Send a registration request with a SD-JWT as a illegitimate Holder
  - http://localhost:4001/registrationDemo - Send a registration request with a valid SD-JWT
- Thing2
  - http://localhost:4002/queryDemo - Send a query request asking for Thing1
  - http://localhost:4002/issuerRequestDemo - Send a request to Issuer1 to retrieve the whole TD of Thing1 (requires /queryDemo to be sent beforehand)
  - http://localhost:4002/thingConsumptionDemo - Send a example TD request using node-wot to Thing1 (requires /issuerRequestDemo to be sent beforehand)
- Issuer1
  - http://localhost:3004/deleteThing1 - Send a deletion request

Example:

- Look into the logs of TD Directory: http://localhost:3005/
- Send a query request: http://localhost:4002/queryDemo
- Look into the logs of TD Directory again
- Send a registration request: http://localhost:4001/revokedStatusDemo
- Look into the logs of TD Directory again
- Send a query request: http://localhost:4002/queryDemo
- Send an issuer request: http://localhost:4002/issuerRequestDemo
- Invoke a TD request to Thing1: http://localhost:4002/thingConsumptionDemo

## Notes

- In the implementation, the actors communicate using HTTPS. However, RPC calls in this demo are made through HTTP. Therefore, some actors are listening through two different ports.
- To demonstrate communication through HTTPS, the actors hold SSL certificates. These SSL certificates are only for demo purposes (and not actually valid).
- The DID Documents for this demo are stored on a secure web storage, fetched through the did:web resolver using HTTPS: https://github.com/phamkv/phamkv.github.io (as of now, changing the DIDs in this demo have to be made manually in the code)
- The content of the DID Documents (for demo purposes) can still be found in the `diddoc` folder. The folder also contains the private key for transparency (only for demo purposes).
- Issuer2 is not started because this demo concisely concentrates on the WoT Discovery process. Issuer1 is already used for demo purposes and issueing VCs is done implicitly.
