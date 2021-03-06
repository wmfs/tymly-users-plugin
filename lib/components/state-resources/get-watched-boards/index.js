'use strict'

class GetWatchedBoards {
  init (resourceConfig, env) {
    this.watchedBoards = env.bootedServices.storage.models.tymly_watchedBoards
  }

  run (event, context) {
    this.watchedBoards.find({ where: { userId: { equals: context.userId } } })
      .then(results => {
        const ctx = {
          watchCategories: {}
        }

        const categories = new Set()
        results.forEach(r => categories.add(r.category))
        categories.forEach(c => {
          ctx.watchCategories[c] = {}
        })

        results.forEach(r => {
          if (!Object.keys(ctx.watchCategories[r.category]).includes(r.categoryLabel)) {
            ctx.watchCategories[r.category][r.categoryLabel] = {
              total: 0,
              subscriptions: []
            }
          }

          ctx.watchCategories[r.category][r.categoryLabel].total++
          ctx.watchCategories[r.category][r.categoryLabel].subscriptions.push(
            {
              subscriptionId: r.id,
              feedName: r.feedName,
              title: r.title,
              description: r.description,
              startedWatching: r.startedWatching,
              launches: r.launches
            }
          )
        })

        context.sendTaskSuccess(ctx)
      })
      .catch(err => context.sendTaskFailure({ error: 'getWatchedBoardsFail', cause: err }))
  }
}

module.exports = GetWatchedBoards
