/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')
const sqlScriptRunner = require('./fixtures/sql-script-runner.js')

const GET_TODO_CHANGES_STATE_MACHINE = 'tymly_getTodoChanges_1_0'
const CREATE_TO_DO_ENTRY = 'tymly_createTodoEntry_1_0'
const REMOVE_TODO_STATE_MACHINE = 'tymly_removeTodoEntries_1_0'

const ID_1 = '5200987c-bb03-11e7-abc4-cec278b6b111'
const ID_2 = '5200987c-bb03-11e7-abc4-cec278b6b50a'

describe('todo changes tymly-users-plugin tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let statebox, todos, tymlyService, client

  before(function () {
    if (process.env.PG_CONNECTION_STRING && !/^postgres:\/\/[^:]+:[^@]+@(?:localhost|127\.0\.0\.1).*$/.test(process.env.PG_CONNECTION_STRING)) {
      console.log(`Skipping tests due to unsafe PG_CONNECTION_STRING value (${process.env.PG_CONNECTION_STRING})`)
      this.skip()
    }
  })

  it('should create some basic tymly services', done => {
    tymly.boot(
      {
        pluginPaths: [
          path.resolve(__dirname, './../lib'),
          require.resolve('@wmfs/tymly-pg-plugin'),
          require.resolve('@wmfs/tymly-solr-plugin')
        ]
      },
      (err, tymlyServices) => {
        expect(err).to.eql(null)
        statebox = tymlyServices.statebox
        todos = tymlyServices.storage.models['tymly_todos']
        tymlyService = tymlyServices.tymly
        client = tymlyServices.storage.client
        done()
      }
    )
  })

  it('should create todo entry for a user', async () => {
    const executionDescription = await statebox.startExecution(
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

    expect(executionDescription.currentStateName).to.eql('CreateTodoEntry')
    expect(executionDescription.currentResource).to.eql('module:createTodoEntry')
    expect(executionDescription.stateMachineName).to.eql(CREATE_TO_DO_ENTRY)
    expect(executionDescription.status).to.eql('SUCCEEDED')
  })

  it('should ensure the created todo is present', async () => {
    const doc = await todos.findById(ID_1)
    expect(doc.userId).to.eql('todo-user')
    expect(doc.description).to.eql('Claiming $12 for A pack of Duff Beer')
  })

  it('should update a todo entry for a user', async () => {
    const executionDescription = await statebox.startExecution(
      {
        todoTitle: 'ToDo Expense Claim',
        stateMachineTitle: 'Process expense claim for User',
        stateMachineCategory: 'Expenses',
        description: 'User is claiming $12 for A pack of Duff Beer',
        id: ID_1
      },
      CREATE_TO_DO_ENTRY,
      {
        sendResponse: 'COMPLETE',
        userId: 'todo-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('CreateTodoEntry')
    expect(executionDescription.currentResource).to.eql('module:createTodoEntry')
    expect(executionDescription.stateMachineName).to.eql(CREATE_TO_DO_ENTRY)
    expect(executionDescription.status).to.eql('SUCCEEDED')
  })

  it('should ensure the created todo is present', async () => {
    const doc = await todos.findById(ID_1)
    expect(doc.userId).to.eql('todo-user')
    expect(doc.description).to.eql('User is claiming $12 for A pack of Duff Beer')
  })

  it('should remove the todo created for test', async () => {
    await todos.destroyById(ID_1)
  })

  it('should ensure created todo is removed', async () => {
    const doc = await todos.findById(ID_1)
    expect(doc).to.eql(undefined)
  })

  // for getUserRemit
  it('should create the settings test resources', () => {
    return sqlScriptRunner('./db-scripts/settings/setup.sql', client)
  })

  // for getUserRemit
  it('should create the favourites test resources', () => {
    return sqlScriptRunner('./db-scripts/favourites/setup.sql', client)
  })

  // for getTodos
  it('should create the todos test resources', () => {
    return sqlScriptRunner('./db-scripts/todos/setup.sql', client)
  })

  it('should start the state machine to get todo changes with no client to do\'s', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientTodos: [] // for getTodos
      },
      GET_TODO_CHANGES_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetTodoChanges')
    expect(executionDescription.currentResource).to.eql('module:getTodoChanges')
    expect(executionDescription.stateMachineName).to.eql(GET_TODO_CHANGES_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(Object.keys(executionDescription.ctx.todoChanges.add).length).to.eql(2)
    expect(Object.keys(executionDescription.ctx.todoChanges.add)
      .includes(ID_2)).to.eql(true)
    expect(Object.keys(executionDescription.ctx.todoChanges.add)
      .includes('0d625558-ce99-11e7-b7e3-c38932399c15')).to.eql(true)
    expect(executionDescription.ctx.todoChanges.remove).to.eql([])
  })

  it('should start the state machine to get todo changes', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientTodos: [
          ID_2,
          '52009d36-bb03-11e7-abc4-cec278b6b50a',
          '52009e4e-bb03-11e7-abc4-cec278b6b50a',
          '52009f20-bb03-11e7-abc4-cec278b6b50a',
          '52009ff2-bb03-11e7-abc4-cec278b6b50a'
        ] // for getTodos
      },
      GET_TODO_CHANGES_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetTodoChanges')
    expect(executionDescription.currentResource).to.eql('module:getTodoChanges')
    expect(executionDescription.stateMachineName).to.eql(GET_TODO_CHANGES_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(Object.keys(executionDescription.ctx.todoChanges.add)).to.eql([
      '0d625558-ce99-11e7-b7e3-c38932399c15'
    ])
    expect(executionDescription.ctx.todoChanges.remove.length).to.eql(4)
    expect(executionDescription.ctx.todoChanges.remove
      .includes('52009d36-bb03-11e7-abc4-cec278b6b50a')).to.eql(true)
    expect(executionDescription.ctx.todoChanges.remove
      .includes('52009e4e-bb03-11e7-abc4-cec278b6b50a')).to.eql(true)
    expect(executionDescription.ctx.todoChanges.remove
      .includes('52009f20-bb03-11e7-abc4-cec278b6b50a')).to.eql(true)
    expect(executionDescription.ctx.todoChanges.remove
      .includes('52009ff2-bb03-11e7-abc4-cec278b6b50a')).to.eql(true)
  })

  it('should ensure a todo is present in the list in preparation to remove it', async () => {
    const doc = await todos.findById(ID_2)
    expect(doc.userId).to.eql('test-user')
    expect(doc.description).to.eql('Homer Simpson is claiming $12 for A pack of Duff Beer')
  })

  it('should be able to remove a todo entry from the list', async () => {
    const executionDescription = await statebox.startExecution(
      {
        todoId: ID_2
      },
      REMOVE_TODO_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.status).to.eql('SUCCEEDED')
  })

  it('should fail to find the removed todo', async () => {
    const doc = await todos.findById(ID_2)
    expect(doc).to.eql(undefined)
  })

  it('should fail to find a todo that doesn\'t exist', async () => {
    const executionDescription = await statebox.startExecution(
      {
        todoId: 'FAILHERE'
      },
      REMOVE_TODO_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.status).to.eql('FAILED')
    expect(executionDescription.errorCode).to.eql('removeTodoFail')
  })

  it('should tear down the test resources', () => {
    return sqlScriptRunner('./db-scripts/cleanup.sql', client)
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
