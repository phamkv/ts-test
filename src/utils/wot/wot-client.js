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

export const retrieveUrlFromTD = (thingDescription) => {
    const property = thingDescription.properties[Object.keys(thingDescription.properties)[0]]
    const href = property.forms[0].href

    const startIndex = href.indexOf("properties");
    return href.slice(0, startIndex - 1);
}

export const wotThingExample = async (url) => {
    await WoTHelpers.fetch(url).then(async (td) => {
        try {
            const WoT = await servient.start();
            // Then from here on you can consume the thing
            let thing = await WoT.consume(td);
            console.info("=== TD ===");
            console.info(thing);
            console.info("==========");

            // read property
            const read1 = await thing.readProperty("status");
            console.log("switch value is", await read1.value());

            console.log("Toggling the Light Switch...")
            // toggle property
            await thing.invokeAction("toggle");
            const read2 = await thing.readProperty("status");
            console.log("switch value is", await read2.value());
        }
        catch (err) {
            console.error("Script error:", err);
        }
    }).catch((err) => { console.error("Fetch error:", err); })
}

// wotThingExample("http://localhost:8080/lightswitch")