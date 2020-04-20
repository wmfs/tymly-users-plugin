'use strict'

class WatchBoard {
  init (resourceConfig, env) {
    this.watchedBoards = env.bootedServices.storage.models['tymly_watchedBoards']
  }

  run (event, context) {
    let feedName = [event.stateMachineName]
    if (event.boardKeys) Object.keys(event.boardKeys).sort().map(k => feedName.push(event.boardKeys[k]))
    feedName = feedName.join('|')

    const launches = [{
      stateMachineName: event.stateMachineName,
      input: {
        boardKeys: event.boardKeys
      }
    }]

    const startedWatching = new Date().toISOString()

    this.watchedBoards.upsert(
      {
        userId: context.userId,
        feedName: feedName,
        title: event.title,
        description: event.description,
        startedWatching: startedWatching,
        launches: JSON.stringify(launches),
        category: event.category,
        categoryLabel: event.categoryLabel
      },
      {}
    )
      .then((doc) => {
        context.sendTaskSuccess({
          subscriptionId: doc.idProperties.id,
          feedName: feedName,
          startedWatching: startedWatching
        })
      })
      .catch(err => context.sendTaskFailure(err))
  }
}

module.exports = WatchBoard
