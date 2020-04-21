'use strict'

class RemoveTodoEntries {
  init (resourceConfig, env) {
    this.todos = env.bootedServices.storage.models.tymly_todos
  }

  run (event, context) {
    this.todos.destroyById(event.todoId)
      .then(context.sendTaskSuccess())
      .catch(err => context.sendTaskFailure({ error: 'removeTodoFail', cause: err }))
  }
}

module.exports = RemoveTodoEntries
