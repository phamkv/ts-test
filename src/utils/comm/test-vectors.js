export const THING1_SECRETS = [
  {
    id: "did:web:phamkv.github.io:things:thing1#owner",
    type: "JsonWebKey2020",
    privateKeyJwk: {
      kty: "EC",
      x: "La5CZtPKGyiO9BXC4Pz8TBiWmT7KUygonwRAu5iHdqg",
      y: "1t1LiboWV4KWHeJGIcPxgyxMLFjXGlp6Wga9pWjfD10",
      crv: "P-256",
      d: "n7M3cHj27knNZE0hDmnBVk9dCQgF5Hf_XxEi3LRCEnk",
      kid: "BKZMsG7e6iFF63o4DpKJgzEIQ9xosw96ll2L-N4yCDs",
      use: "sig"
    },
  },
];

export const THING2_SECRETS = [
  {
    id: "did:web:phamkv.github.io:things:thing2#owner",
    type: "JsonWebKey2020",
    privateKeyJwk: {
      kty: "EC",
      x: "tsPws97g_rLuhkz3_7_VvEvMSStEE5-vbH90yoqmTws",
      y: "MClgXxAYMqh-Q8x6at5Lj5hOEz4OWMEv1jYhQbw1sdY",
      crv: "P-256",
      d: "I0KhInbi8aJzBB4MDQ38O2jbMrhqtD_3-_q4R3kD21c",
      kid: "bQ_yWvDNCWLQOh26ZVdPc3IswYeS4ntmk0ysf92Az_Y",
      use: "sig"
    },
  },
];


export const THING1_DID_DOC = {
  id: "did:web:phamkv.github.io:things:thing1",
  keyAgreement: [
    "did:web:phamkv.github.io:things:thing1#owner",
  ],
  authentication: [
    "did:web:phamkv.github.io:things:thing1#owner",
  ],
  assertionMethod: [],
  verificationMethod: [
    {
      id: "did:web:phamkv.github.io:things:thing1#owner",
      type: "JsonWebKey2020",
      controller: "did:web:phamkv.github.io:things:thing1",
      publicKeyJwk: {
        crv: "P-256",
        kty: "EC",
        x: "La5CZtPKGyiO9BXC4Pz8TBiWmT7KUygonwRAu5iHdqg",
        y: "1t1LiboWV4KWHeJGIcPxgyxMLFjXGlp6Wga9pWjfD10",
      }
    },
  ],
  service: [],
};

export const ALICE_DID_DOC = {
  id: "did:example:alice",
  keyAgreement: [
    "did:example:alice#key-p256-1",
  ],
  authentication: [
    "did:example:alice#key-1",
  ],
  assertionMethod: [],
  verificationMethod: [
    {
      id: "did:example:alice#key-p256-1",
      type: "JsonWebKey2020",
      controller: "did:example:alice#key-p256-1",
      publicKeyJwk: {
        crv: "P-256",
        kty: "EC",
        x: "L0crjMN1g0Ih4sYAJ_nGoHUck2cloltUpUVQDhF2nHE",
        y: "SxYgE7CmEJYi7IDhgK5jI4ZiajO8jPRZDldVhqFpYoo",
      },
    },
    {
      id: "did:example:alice#key-1",
      type: "JsonWebKey2020",
      controller: "did:example:alice#key-1",
      publicKeyJwk: {
        crv: "Ed25519",
        kty: "OKP",
        x: "G-boxFB6vOZBu-wXkm-9Lh79I8nf9Z50cILaOgKKGww",
      },
    },
  ],
  service: [],
};


export const ALICE_SECRETS = [
  {
    id: "did:example:alice#key-1",
    type: "JsonWebKey2020",
    privateKeyJwk: {
      crv: "Ed25519",
      d: "pFRUKkyzx4kHdJtFSnlPA9WzqkDT1HWV0xZ5OYZd2SY",
      kty: "OKP",
      x: "G-boxFB6vOZBu-wXkm-9Lh79I8nf9Z50cILaOgKKGww",
    },
  },
  {
    id: "did:example:alice#key-p256-1",
    type: "JsonWebKey2020",
    privateKeyJwk: {
      crv: "P-256",
      d: "sB0bYtpaXyp-h17dDpMx91N3Du1AdN4z1FUq02GbmLw",
      kty: "EC",
      x: "L0crjMN1g0Ih4sYAJ_nGoHUck2cloltUpUVQDhF2nHE",
      y: "SxYgE7CmEJYi7IDhgK5jI4ZiajO8jPRZDldVhqFpYoo",
    },
  },
];


export const BOB_DID_DOC = {
  id: "did:example:bob",
  keyAgreement: [
    "did:example:bob#key-p256-1",
  ],
  authentication: [],
  verificationMethod: [
    {
      id: "did:example:bob#key-p256-1",
      type: "JsonWebKey2020",
      controller: "did:example:bob#key-p256-1",
      publicKeyJwk: {
        crv: "P-256",
        kty: "EC",
        x: "FQVaTOksf-XsCUrt4J1L2UGvtWaDwpboVlqbKBY2AIo",
        y: "6XFB9PYo7dyC5ViJSO9uXNYkxTJWn0d_mqJ__ZYhcNY",
      },
    },
  ],
  service: [],
};