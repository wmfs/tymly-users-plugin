'use strict'

class GetFavouriteStartableNames {
  init (resourceConfig, env, callback) {
    this.favouringStartableStateMachines = env.bootedServices.storage.models['tymly_favouringStartableStateMachines']
    callback(null)
  }

  /**
   * Gets favourite startables
   * @param {Object} event The event of the current Tymly execution
   * @param {Object} context The current Tymly context object
   * @returns {Object} executionDescription
   * @example
   * const executionDescription = await statebox.startExecution(
   {},
   GET_FAVOURITE_STATE_MACHINE,
   {
      sendResponse: 'COMPLETE',
      userId: 'test-user'
    }
   )
   */
  run (event, context) {
    this.favouringStartableStateMachines
      .findOne({ where: { userId: { equals: context.userId } } })
      .then(result => context.sendTaskSuccess({ results: result ? result.stateMachineNames : [] }))
      .catch(err => context.sendTaskFailure({ error: 'getFavouriteStartableNamesFail', cause: err }))
  }
}

module.exports = GetFavouriteStartableNames
