'use strict'

const jp = require('jsonpath')
const _ = require('lodash')

class AwaitingHumanInput {
  init (resourceConfig, env, callback) {
    this.schema = require('./schema.json')
    this.uiType = resourceConfig.uiType
    this.uiName = resourceConfig.uiName
    this.dataPath = resourceConfig.dataPath
    this.defaults = resourceConfig.defaults
    this.watchedBoards = env.bootedServices.storage.models['tymly_watchedBoards']
    callback(null)
  }

/**
 * Holds a statebox execution to allow the user to have some input e.g. Form filling
 * @param {Object} event The event of the current Tymly execution
 * @param {Object} context The current Tymly context object
 * @param {Function} done Callback fn
 * @returns {Object} executionDescription
 * @example
 * const executionDescription = await statebox.startExecution(
    {},
    HEARTBEAT_STATE_MACHINE,
    {
      sendResponse: 'AFTER_RESOURCE_CALLBACK.TYPE:awaitingHumanInput'
    }
 )
 * */
  async run (event, context, done) {
    let data = {}
    if (this.dataPath) data = jp.value(event, this.dataPath) || {}
    if (this.defaults) data = _.defaults(data, this.defaults)

    Object.keys(data).forEach(key => (data[key] === null) && delete data[key])

    const requiredHumanInput = {
      uiType: this.uiType,
      uiName: this.uiName,
      data: data
    }

    if (this.uiType === 'board') {
      if (event.data) requiredHumanInput.data = event.data
      requiredHumanInput.boardKeys = event.boardKeys || {}

      const feedName = [context.stateMachineMeta.name]
      Object.keys(requiredHumanInput.boardKeys).sort().map(k => feedName.push(requiredHumanInput.boardKeys[k]))

      try {
        const subscription = await this.watchedBoards.findOne(
          {
            where: {
              userId: { equals: context.userId },
              feedName: { equals: feedName.join('|') }
            }
          }
        )
        if (subscription) {
          requiredHumanInput.watchBoardSubscriptionId = subscription.id
          requiredHumanInput.feedName = subscription.feedName
        }
        const executionDescription = await context.sendTaskHeartbeat({ requiredHumanInput })
        done(executionDescription)
      } catch (err) {
        context.sendTaskFailure(err)
      }
    } else {
      const executionDescription = await context.sendTaskHeartbeat({ requiredHumanInput })
      done(executionDescription)
    }
  }
}

module.exports = AwaitingHumanInput
