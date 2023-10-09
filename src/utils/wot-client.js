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

const fetchUrl = "http://localhost:8080/counter?hash=d48a582886dd7d5ce803c0f34301a68c2e097fafc5becd3f8003781af0bca760"

WoTHelpers.fetch(fetchUrl).then(async (td) => {
    try {
        servient.start().then(async (WoT) => {
            // Then from here on you can consume the thing
            // i.e let thing = await WoT.consume(td) ...
            const thing = await WoT.consume(td);
            console.info("=== TD ===");
            console.info(td);
            console.info("==========");

            // read property #1
            const read1 = await thing.readProperty("count");
            console.log("count value is", await read1.value());
        });

        hashlink.verifyObject(fetchUrl)
    }
    catch (err) {
        console.error("Script error:", err);
    }
}).catch((err) => { console.error("Fetch error:", err); });