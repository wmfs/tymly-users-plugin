'use strict'

class ApplySettings {
  init (resourceConfig, env) {
    this.settings = env.bootedServices.storage.models.tymly_settings
  }

  /**
   * Persists a change of settings
   * @param {Object} event The event of the current Tymly execution
   * @param {Object} context The current Tymly context object
   * @returns {Object} executionDescription
   * @example
   * const executionDescription = await statebox.startExecution(
   {
        categoryRelevance: '["incidents", "hr", "hydrants", "gazetteer", "expenses"]'
      },
   APPLY_SETTINGS_STATE_MACHINE,
   {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
   )
   * */
  run (event, context) {
    this.settings.upsert({ userId: context.userId, categoryRelevance: event.categoryRelevance }, {})
      .then(() => context.sendTaskSuccess())
      .catch((err) => context.sendTaskFailure(err))
  }
}

module.exports = ApplySettings
