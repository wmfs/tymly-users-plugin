'use strict'

class CreateTodoEntry {
  init (resourceConfig, env, callback) {
    this.todos = env.bootedServices.storage.models['tymly_todos']
    callback(null)
  }

/**
 * Creates a todo for use within Tymly
 * @param {Object} event The event of the current Tymly execution
 * @param {Object} context The current Tymly context object
 * @returns {Object} executionDescription
 * @example
 * const executionDescription = await statebox.startExecution(
    {
      todoTitle: 'ToDo Expense Claim',
      stateMachineTitle: 'Process expense claim for User',
      stateMachineCategory: 'Expenses',
      description: 'Claiming $12 for A pack of Duff Beer',
      id: ID_1
    },
    CREATE_TO_DO_ENTRY,
    {
      sendResponse: 'COMPLETE',
      userId: 'todo-user'
    }
 )
 */
  run (event, context) {
    const upsert = {
      userId: context.userId,
      stateMachineTitle: event.stateMachineTitle,
      stateMachineCategory: event.stateMachineCategory,
      requiredHumanInput: event.requiredHumanInput,
      description: event.description,
      launches: event.launches,
      todoTitle: event.todoTitle
    }

    if (event.id) upsert.id = event.id

    this.todos.upsert(upsert, {})
      .then(doc => context.sendTaskSuccess(doc))
      .catch(err => context.sendTaskFailure(err))
  }
}

module.exports = CreateTodoEntry
