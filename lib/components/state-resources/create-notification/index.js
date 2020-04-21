'use strict'

class CreateNotification {
  init (resourceConfig, env) {
    this.notifications = env.bootedServices.storage.models.tymly_notifications
  }

  /**
   * Creates a notification for use within Tymly
   * @param {Object} event The event of the current Tymly execution
   * @param {Object} context The current Tymly context object
   * @returns {Object} executionDescription
   * @example
   * const executionDescription = await statebox.startExecution(
   {
        title: 'testNotification',
        description: 'This is a notification used for testing',
        category: 'test'
    },
   CREATE_NOTIFICATIONS_STATE_MACHINE,
   {
        sendResponse: 'COMPLETE',
        userId: 'test-user-1'
    }
   )
   * */
  run (event, context) {
    const create = {
      userId: context.userId,
      title: event.title,
      description: event.description,
      category: event.category,
      launches: event.launches
    }

    this.notifications.create(create, {})
      .then(() => context.sendTaskSuccess())
      .catch(err => context.sendTaskFailure(err))
  }
}

module.exports = CreateNotification
