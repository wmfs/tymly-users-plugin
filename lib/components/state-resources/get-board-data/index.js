'use strict'

const _ = require('lodash')

class GetBoardData {
  init (resourceConfig, env) {
    this.schema = require('./schema.json')
    this.models = env.bootedServices.storage.models
    this.modelName = resourceConfig.model
  }

  /**
   * Collects data to attach to a board in Tymly
   * @param {Object} event The event of the current Tymly execution
   * @param {Object} context The current Tymly context object
   * @returns {Object} executionDescription
   * @example
   * const executionDescription = await statebox.startExecution(
   {
      boardKeys: {
        name: 'Alfred'
      }
    },
   GET_SINGLE_BOARD_STATE_MACHINE,
   {
      sendResponse: 'COMPLETE',
      userId: 'test-user'
    }
   )
   */
  run (event, context) {
    if (!event.boardKeys) return context.sendTaskSuccess({ data: {}, boardKeys: {} })

    const where = Object.keys(event.boardKeys).reduce((keys, k) => {
      keys[k] = { equals: event.boardKeys[k] }
      return keys
    }, {})

    if (_.isArray(this.modelName)) {
      const models = this.modelName.map(m => this.models[`${context.stateMachineMeta.namespace}_${m}`])
      const findPromises = models.map(model => model.findOne({ where }))
      Promise.all(findPromises)
        .then(docs => {
          const data = {}
          models.map((model, idx) => {
            data[model.modelId] = docs[idx]
          })
          Object.keys(event).map(key => {
            if (key !== 'boardKeys') data[key] = event[key]
          })
          context.sendTaskSuccess({ data: data, boardKeys: event.boardKeys })
        })
        .catch(err => context.sendTaskFailure({ error: 'getBoardFail', cause: err }))
    } else {
      const model = this.models[`${context.stateMachineMeta.namespace}_${this.modelName}`]
      model.findOne({ where })
        .then(doc => context.sendTaskSuccess({ data: doc, boardKeys: event.boardKeys }))
        .catch(err => context.sendTaskFailure({ error: 'getBoardFail', cause: err }))
    }
  }
}

module.exports = GetBoardData
