// client.js
// Required steps to create a servient for a client
import nodeWot from "@node-wot/core"
import httpBinding from "@node-wot/binding-http"
const Servient = nodeWot.Servient
const Helpers = nodeWot.Helpers
const HttpClientFactory = httpBinding.HttpClientFactory

const servient = new Servient();
servient.addClientFactory(new HttpClientFactory(null));
const WoTHelpers = new Helpers(servient);

WoTHelpers.fetch("http://localhost:8080/counter").then(async (td) => {
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
    }
    catch (err) {
        console.error("Script error:", err);
    }
}).catch((err) => { console.error("Fetch error:", err); });