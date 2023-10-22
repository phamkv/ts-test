{
  '@context': [
    'https://www.w3.org/2019/wot/td/v1',
    'https://www.w3.org/2022/wot/td/v1.1',
    { iot: 'http://example.org/iot' },
    { '@language': 'en' }
  ],
  '@type': 'Thing',
  title: 'Counter',
  securityDefinitions: {},
  security: '',
  properties: {
    count: {
      title: 'Count',
      titles: [Object],
      type: 'integer',
      description: 'Current counter value',
      descriptions: [Object],
      'iot:Custom': 'example annotation',
      observable: true,
      readOnly: true
    },
    countAsImage: {
      description: 'Current counter value as SVG image',
      descriptions: [Object],
      observable: false,
      readOnly: true,
      uriVariables: [Object],
      forms: [Array]
    },
    redDotImage: {
      description: 'Red dot image as PNG',
      descriptions: [Object],
      observable: false,
      readOnly: true,
      forms: [Array]
    },
    lastChange: {
      title: 'Last change',
      titles: [Object],
      type: 'string',
      description: 'Last change of counter value',
      descriptions: [Object],
      observable: true,
      readOnly: true
    }
  },
  actions: {
    increment: {
      title: 'Increment',
      titles: [Object],
      description: 'Increment counter value',
      descriptions: [Object]
    },
    decrement: {
      title: 'Decrement',
      titles: [Object],
      description: 'Decrementing counter value',
      descriptions: [Object]
    },
    reset: {
      title: 'Reset',
      titles: [Object],
      description: 'Resetting counter value',
      descriptions: [Object]
    }
  },
  events: {
    change: {
      title: 'Changed',
      titles: [Object],
      description: 'Change event',
      descriptions: [Object]
    }
  },
  links: [
    {
      href: 'https://www.thingweb.io/img/favicon/favicon.png',
      sizes: '16x14',
      rel: 'icon'
    }
  ],
  __propertyHandlers: Map(0) {},
  __actionHandlers: Map(0) {},
  __eventHandlers: Map(0) {},
  __propertyListeners: ProtocolListenerRegistry { listeners: Map(0) {} },
  __eventListeners: ProtocolListenerRegistry { listeners: Map(0) {} },
  getServient: [Function (anonymous)],
  id: 'did:web:maxistdumm.com',
  titles: { en: 'Counter', de: 'Zähler', it: 'Contatore' },
  description: 'Counter example Thing',
  descriptions: {
    en: 'Counter example Thing',
    de: 'Zähler Beispiel Ding',
    it: 'Contatore di esempio'
  },
  support: 'https://github.com/eclipse-thingweb/node-wot/',
  uriVariables: { step: { type: 'integer', minimum: 1, maximum: 250 } }
}