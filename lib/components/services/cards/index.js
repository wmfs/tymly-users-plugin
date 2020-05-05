'use strict'

const shasum = require('shasum')

class CardsService {
  /**
   * Boot function to expose Cards service class
   * @param {object} options
   * @param {function} callback Callback function for when boot is complete
   */
  boot (options) {
    this.cards = {}
    const { cardTemplates } = options.blueprintComponents

    for (const cardId in cardTemplates) {
      if (Object.prototype.hasOwnProperty.call(cardTemplates, cardId)) {
        options.messages.info(cardId)
        this.cards[cardId] = {
          ...cardTemplates[cardId],
          shasum: shasum(cardTemplates[cardId])
        }
      }
    }
  }
}

module.exports = {
  serviceClass: CardsService,
  refProperties: {
    cardId: 'card-templates'
  },
  bootBefore: ['tymly', 'rbac']
}
