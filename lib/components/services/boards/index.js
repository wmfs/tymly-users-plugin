'use strict'

const shasum = require('shasum')

class BoardsService {
  /**
   * Boot function to expose Boards service class
   * @param {object} options
   * @param {function} callback Callback function for when boot is complete
   */
  boot (options, callback) {
    this.boards = {}

    const boardDefinitions = options.blueprintComponents.boards || {}
    let boardDefinition

    for (let boardId in boardDefinitions) {
      if (boardDefinitions.hasOwnProperty(boardId)) {
        options.messages.info(boardId)
        boardDefinition = boardDefinitions[boardId]
        boardDefinition.shasum = shasum(boardDefinition)
        this.boards[boardId] = boardDefinition
      }
    }

    callback(null)
  }
}

module.exports = {
  serviceClass: BoardsService,
  refProperties: {
    boardId: 'boards'
  },
  bootBefore: ['tymly', 'rbac']
}
