'use strict'

const shasum = require('shasum')

class CardsService {
  /**
   * Boot function to expose Cards service class
   * @param {object} options
   * @param {function} callback Callback function for when boot is complete
   */
  boot (options, callback) {
    this.cards = {}
    const { cardTemplates } = options.blueprintComponents

    for (const cardId in cardTemplates) {
      if (cardTemplates.hasOwnProperty(cardId)) {
        options.messages.info(cardId)
        this.cards[cardId] = {
          ...cardTemplates[cardId],
          shasum: shasum(cardTemplates[cardId])
        }
      }
    }

    callback(null)
  }
}

module.exports = {
  serviceClass: CardsService,
  refProperties: {
    cardId: 'card-templates'
  },
  bootBefore: ['tymly', 'rbac']
}
