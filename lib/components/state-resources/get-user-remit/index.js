const _ = require('lodash')
const debug = require('debug')('tymly-users-plugin')
const shasum = require('shasum')

class GetUserRemit {
  init (resourceConfig, env, callback) {
    this.categories = env.bootedServices.categories
    this.teams = env.bootedServices.storage.models['tymly_teams']
    this.todos = env.bootedServices.storage.models['tymly_todos']
    this.forms = env.bootedServices.forms
    this.boards = env.bootedServices.boards
    this.cards = env.bootedServices.cards
    this.statebox = env.bootedServices.statebox
    this.services = env.bootedServices
    callback(null)
  } // init

  get rbac () { return this.services.rbac } // RBAC will not have started when init is called.

  async run (event, context) {
    const userId = context.userId

    const settings = { categoryRelevance: event.userSettings.categoryRelevance }
    const favourites = event.favourites.results.length > 0 ? event.favourites.results : []

    const userRemit = {
      add: {},
      remove: {},
      settings: settings,
      favouriteStartableNames: favourites
    }

    const promises = [
      this.findComponents(userRemit, this.todos, 'todos', 'id', event.clientManifest['todos'], userId),
      this.findComponents(userRemit, this.teams, 'teams', 'title', event.clientManifest['teams'])
    ]

    if (this.categories) {
      promises.push(this.processComponents(userRemit, 'categories', this.categories.categories, event.clientManifest['categoryNames']))
    }

    if (this.forms) {
      promises.push(this.processComponents(userRemit, 'forms', this.forms.forms, event.clientManifest['formNames']))
    }

    if (this.boards) {
      promises.push(this.processComponents(userRemit, 'boards', this.boards.boards, event.clientManifest['boardNames']))
    }

    if (this.cards) {
      promises.push(this.processComponents(userRemit, 'cards', this.cards.cards, event.clientManifest['cardNames']))
    }

    if (this.statebox && this.categories) {
      const allowedStartable = await GetUserRemit.findStartableMachines(userId, context, this.statebox, this.categories, this.rbac)
      promises.push(this.processComponents(userRemit, 'startable', allowedStartable, event.clientManifest['startable']))
    }

    Promise.all(promises)
      .then(() => context.sendTaskSuccess({ userRemit }))
      .catch(err => context.sendTaskFailure({ error: 'getUserRemitFail', cause: err }))
  } // run

  findComponents (userRemit, model, componentType, titleCol, alreadyInClientManifest, userId) {
    const where = userId ? { where: { userId: { equals: userId } } } : {}
    return model.find(where)
      .then(results => {
        const resultsObj = {}
        results.map(r => { resultsObj[r[titleCol]] = r })
        debug(componentType + ': ' + JSON.stringify(resultsObj, null, 2))
        this.processComponents(userRemit, componentType, resultsObj, alreadyInClientManifest)
      })
  } // findComponents

  processComponents (userRemit, componentType, components, alreadyInClientManifest) {
    userRemit.add[componentType] = {}

    Object.keys(components).forEach(componentName => {
      GetUserRemit.checkShasum(userRemit, alreadyInClientManifest, components[componentName], componentType, componentName)
    })

    let namesToRemove
    if (_.isArray(alreadyInClientManifest)) {
      namesToRemove = _.difference(alreadyInClientManifest, Object.keys(components))
    } else if (_.isPlainObject(alreadyInClientManifest)) {
      namesToRemove = _.difference(Object.keys(alreadyInClientManifest), Object.keys(components))
    }
    if (namesToRemove.length > 0) {
      userRemit.remove[componentType] = namesToRemove
    }
    return userRemit
  } // processComponents

  static checkShasum (userRemit, alreadyInClientManifest, component, type, name) {
    if (component.shasum) {
      const componentShasum = component.shasum
      const clientShasum = alreadyInClientManifest[name]
      if (componentShasum !== clientShasum) {
        userRemit.add[type][name] = component
      }
    } else {
      if (!alreadyInClientManifest.includes(name)) {
        userRemit.add[type][name] = component
      }
    }
  } // checkShasum

  static async findStartableMachines (userId, context, statebox, categories, rbac) {
    const startable = GetUserRemit.findAllStartableMachines(statebox.listStateMachines(), categories.names)

    const authChecks = Object.keys(startable)
      .reduce((keys, resourceName) => {
        const isAuth = rbac.checkAuthorization(
          userId,
          context,
          'stateMachine',
          resourceName,
          'create'
        )
        keys[resourceName] = isAuth.then(a => { keys[resourceName] = a })
        return keys
      }, { })
    await Promise.all(Object.values(authChecks))

    const allowedStartable = Object.keys(authChecks)
      .reduce((keys, resourceName) => {
        const isAuth = authChecks[resourceName]
        if (isAuth && (startable[resourceName].instigators && startable[resourceName].instigators.includes('user'))) {
          keys[resourceName] = startable[resourceName]
          keys[resourceName].shasum = shasum(startable[resourceName])
        }
        return keys
      }, {})

    return allowedStartable
  } // findStartableMachines

  static findAllStartableMachines (machines, categories) {
    const startable = {}

    for (const machine of Object.values(machines)) {
      if (!machine.categories || machine.categories.length === 0) {
        continue
      }

      const category = machine.categories[0]
      if (!categories.includes(category)) {
        continue
      }

      startable[machine.name] = {
        name: machine.name,
        title: machine.name,
        description: machine.description,
        category: category,
        instigators: machine.instigators
      }
    } // for ...

    return startable
  } // findAllStartableMachines
}

module.exports = GetUserRemit
