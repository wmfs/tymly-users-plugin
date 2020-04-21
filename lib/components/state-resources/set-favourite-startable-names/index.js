'use strict'

class SetFavouriteStartableNames {
  init (resourceConfig, env) {
    this.favouringStartableStateMachines = env.bootedServices.storage.models.tymly_favouringStartableStateMachines
  }

  run (event, context) {
    this.favouringStartableStateMachines
      .upsert(
        {
          userId: context.userId,
          stateMachineNames: event.stateMachineNames
        },
        {}
      )
      .then(() => context.sendTaskSuccess())
      .catch(err => context.sendTaskFailure(err))
  }
}

module.exports = SetFavouriteStartableNames
