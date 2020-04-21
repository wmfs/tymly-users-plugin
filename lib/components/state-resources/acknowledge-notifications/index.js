'use strict'

class AcknowledgeNotifications {
  init (resourceConfig, env) {
    this.notifications = env.bootedServices.storage.models.tymly_notifications
  }

  /**
   * Marks a collection of notifications as 'acknowledged'
   * @param {Object} event The event of the current Tymly execution
   * @param {Object} context The current Tymly context object
   * @returns {Object} executionDescription
   * @example
   * const executionDescription = await statebox.startExecution(
      {
        notificationsToMark: notificationsToMark
      },
      ACKNOWLEDGE_NOTIFICATIONS_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
   )
   */
  run (event, context) {
    const promises = event.notificationsToMark.map(id => {
      return this.notifications.update({
        id: id,
        userId: context.userId,
        acknowledged: new Date().toISOString()
      }, { setMissingPropertiesToNull: false })
    })

    Promise.all(promises)
      .then(() => context.sendTaskSuccess())
      .catch(err => context.sendTaskFailure({ error: 'acknowledgeNotificationsFail', cause: err }))
  }
}

module.exports = AcknowledgeNotifications
