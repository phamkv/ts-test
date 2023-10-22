// server.js
// Required steps to create a servient for creating a thing
import { Servient } from "@node-wot/core"
import httpBinding from "@node-wot/binding-http"
import * as hashlink from "./hashlink.js"
const HttpServer = httpBinding.HttpServer

const servient = new Servient();
servient.addServer(new HttpServer());

servient.start().then(async (WoT) => {
    /********************************************************************************
     * Copyright (c) 2023 Contributors to the Eclipse Foundation
     *
     * See the NOTICE file(s) distributed with this work for additional
     * information regarding copyright ownership.
     *
     * This program and the accompanying materials are made available under the
     * terms of the Eclipse Public License v. 2.0 which is available at
     * http://www.eclipse.org/legal/epl-2.0, or the W3C Software Notice and
     * Document License (2015-05-13) which is available at
     * https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document.
     *
     * SPDX-License-Identifier: EPL-2.0 OR W3C-20150513
     ********************************************************************************/

    // Then from here on you can use the WoT object to produce the thing
    let count = 0;
    const exposingThing = await WoT.produce({
        title: "Counter",
        id: "did:web:phamkv.github.io:things:thing1",
        description: "A simple counter thing",
        properties: {
            count: {
                type: "integer",
                description: "current counter value",
                observable: true,
                readOnly: true
            }
        },
        actions: {
            increment: {
                description: "increment counter value",
            }
        }
    })
    exposingThing.setPropertyReadHandler("count", () => { return count; });
    exposingThing.setActionHandler("increment", () => { count++; exposingThing.emitPropertyChange("count"); });
    await exposingThing.expose();
    console.log(`Produced ${exposingThing.getThingDescription()}`);
    console.log(exposingThing.getThingDescription())

    console.log(`http://localhost:8080/${exposingThing.title.toLowerCase()}`)
    
    // const hl = await hashlink.createHashlink(`http://localhost:8080/${exposingThing.title.toLowerCase()}`)
    // console.log(hl)
});