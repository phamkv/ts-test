import { Resolver } from 'did-resolver'
import { getResolver } from 'web-did-resolver'

async function resolveDIDWeb(url) {
  const webResolver = getResolver()
  const resolver = new Resolver({
    ...webResolver
  })
  
  return await resolver.resolve(url).then(result => result["didDocument"])
}

export async function resolvePublicKeyWeb(url) {
  const didDocument = await resolveDIDWeb(url)
  return {
    "keys": didDocument["verificationMethod"].filter(method => "publicKeyJwk" in method).map(method => method.publicKeyJwk)
  }
    
  // return didDocument["verificationMethod"].find(method => method.id === didDocument["authentication"][0]).publicKeyJwk
}
//const doc = await resolvePublicKeyWeb('did:web:phamkv.github.io:things:thing1')
// console.log(doc)