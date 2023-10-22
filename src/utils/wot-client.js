// client.js
// Required steps to create a servient for a client
import nodeWot from "@node-wot/core"
import httpBinding from "@node-wot/binding-http"
import * as hashlink from "./hashlink.js"
const Servient = nodeWot.Servient
const Helpers = nodeWot.Helpers
const HttpClientFactory = httpBinding.HttpClientFactory

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
const WoTHelpers = new Helpers(servient);

// Credit to W3C
const thingDescription = {
    "@context": "https://www.w3.org/2022/wot/td/v1.1",
    "id": "did:web:phamkv.github.io:things:thing1",
    "@type": "saref:LightSwitch",
    "title": "MyLampThing",
    "securityDefinitions": {
        "basic_sc": {"scheme": "basic", "in": "header"},
        "nosec_sc": {"scheme": "nosec"},
    },
    "security": "nosec_sc",
    "properties": {
        "status": {
            "type": "string",
            "forms": [{"href": "https://mylamp.example.com/status"}]
        }
    },
    "actions": {
        "toggle": {
            "forms": [{"href": "https://mylamp.example.com/toggle"}]
        }
    },
    "events": {
        "overheating": {
            "data": {"type": "string"},
            "forms": [{
                "href": "https://mylamp.example.com/oh",
                "subprotocol": "longpoll"
            }]
        }
    }
}

WoTHelpers.fetch("http://localhost:8080/counter").then(async (td) => {
    try {
        const WoT = await servient.start();
        // Then from here on you can consume the thing
        let thing = await WoT.consume(thingExample);
        console.info("=== TD ===");
        console.info(td);
        console.info("==========");

        // read property #1
        const read1 = await thing.readProperty("count");
        console.log("count value is", await read1.value());
    }
    catch (err) {
        console.error("Script error:", err);
    }
}).catch((err) => { console.error("Fetch error:", err); });