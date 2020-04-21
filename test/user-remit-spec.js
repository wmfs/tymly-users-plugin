/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')
const sqlScriptRunner = require('./fixtures/sql-script-runner.js')

const GET_USER_REMIT_STATE_MACHINE = 'tymly_getUserRemit_1_0'

describe('user-remit tymly-users-plugin tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let statebox, tymlyService, client

  before(function () {
    if (process.env.PG_CONNECTION_STRING && !/^postgres:\/\/[^:]+:[^@]+@(?:localhost|127\.0\.0\.1).*$/.test(process.env.PG_CONNECTION_STRING)) {
      console.log(`Skipping tests due to unsafe PG_CONNECTION_STRING value (${process.env.PG_CONNECTION_STRING})`)
      this.skip()
    }
  })

  it('should create some basic tymly services', done => {
    tymly.boot(
      {
        blueprintPaths: [
          path.resolve(__dirname, './../test/fixtures/test-blueprint')
        ],
        pluginPaths: [
          path.resolve(__dirname, './../lib'),
          require.resolve('@wmfs/tymly-pg-plugin'),
          require.resolve('@wmfs/tymly-solr-plugin'),
          require.resolve('@wmfs/tymly-rbac-plugin')
        ]
      },
      (err, tymlyServices) => {
        expect(err).to.eql(null)
        statebox = tymlyServices.statebox
        tymlyService = tymlyServices.tymly
        client = tymlyServices.storage.client
        done()
      }
    )
  })

  it('should create the settings test resources', () => {
    return sqlScriptRunner('./db-scripts/settings/setup.sql', client)
  })

  it('should create the favourites test resources', () => {
    return sqlScriptRunner('./db-scripts/favourites/setup.sql', client)
  })

  it('should create the remit test resources', () => {
    return sqlScriptRunner('./db-scripts/remit/setup.sql', client)
  })

  it('should start the state machine to get user remit, should get whole remit because client doesn\'t contain anything', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: [],
          teams: [],
          todos: [],
          formNames: {},
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')

    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.length).to.eql(5)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('gazetteer')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('hr')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('hydrants')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('incidents')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('expenses')).to.eql(true)

    expect(executionDescription.ctx.userRemit.favouriteStartableNames.length).to.eql(2)
    expect(executionDescription.ctx.userRemit.favouriteStartableNames.includes('notifications')).to.eql(true)
    expect(executionDescription.ctx.userRemit.favouriteStartableNames.includes('settings')).to.eql(true)

    {
      const categories = Object.keys(executionDescription.ctx.userRemit.add.categories)
      expect(categories.length).to.eql(4)
      expect(categories.includes('fire')).to.eql(true)
      expect(categories.includes('gazetteer')).to.eql(true)
      expect(categories.includes('system')).to.eql(true)
      expect(categories.includes('water')).to.eql(true)
    }

    expect(Object.keys(executionDescription.ctx.userRemit.add.todos).length).to.eql(1)
    expect(Object.keys(executionDescription.ctx.userRemit.add.todos)
      .includes('a69c0ac9-cde5-11e7-abc4-cec278b6b50a')).to.eql(true)

    expect(Object.keys(executionDescription.ctx.userRemit.add.teams).length).to.eql(2)
    expect(Object.keys(executionDescription.ctx.userRemit.add.teams).includes('Fire Safety (North)')).to.eql(true)
    expect(Object.keys(executionDescription.ctx.userRemit.add.teams).includes('Birmingham (Red watch)')).to.eql(true)

    expect(Object.keys(executionDescription.ctx.userRemit.add.cards)).to.include('test_simple')

    expect(Object.keys(executionDescription.ctx.userRemit.add.forms).length).to.eql(3)
    expect(Object.keys(executionDescription.ctx.userRemit.add.forms).includes('test_addIncidentLogEntry')).to.eql(true)
    expect(Object.keys(executionDescription.ctx.userRemit.add.forms).includes('test_addIncidentSafetyRecord')).to.eql(true)
    expect(Object.keys(executionDescription.ctx.userRemit.add.forms).includes('test_bookSomeoneSick')).to.eql(true)

    expect(Object.keys(executionDescription.ctx.userRemit.add.boards).length).to.eql(2)
    expect(Object.keys(executionDescription.ctx.userRemit.add.boards).includes('test_personalDetails')).to.eql(true)
    expect(Object.keys(executionDescription.ctx.userRemit.add.boards).includes('test_propertyViewer')).to.eql(true)

    // State machine with role: '$authenticated' should appear in startable
    expect(Object.keys(executionDescription.ctx.userRemit.add.startable).includes('test_justAStateMachine_1_0')).to.eql(true)
    // State machine with role: 'topSecretRole' should NOT appear in startable
    expect(Object.keys(executionDescription.ctx.userRemit.add.startable).includes('test_topSecretStateMachine_1_0')).to.eql(false)
    // State machine without 'user' as instigator should NOT appear in startable
    expect(Object.keys(executionDescription.ctx.userRemit.add.startable).includes('test_shouldNotBeOnRemit_1_0')).to.eql(false)

    expect(executionDescription.ctx.userRemit.remove).to.eql({})
  })

  it('what if the user only has settings and no favourites yet?', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: [],
          teams: [],
          todos: [],
          formNames: {},
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user-3'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')

    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.length).to.eql(5)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('expenses')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('gazetteer')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('hydrants')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('hr')).to.eql(true)
    expect(executionDescription.ctx.userRemit.settings.categoryRelevance.includes('incidents')).to.eql(true)

    expect(executionDescription.ctx.userRemit.favouriteStartableNames).to.eql([])
  })

  it('should add fire, water and remove hr category names to the remit', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: ['gazetteer', 'hr'],
          teams: [],
          todos: [],
          formNames: {},
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(Object.keys(executionDescription.ctx.userRemit.add.categories).length).to.eql(3)
    expect(Object.keys(executionDescription.ctx.userRemit.add.categories).includes('fire')).to.eql(true)
    expect(Object.keys(executionDescription.ctx.userRemit.add.categories).includes('system')).to.eql(true)
    expect(Object.keys(executionDescription.ctx.userRemit.add.categories).includes('water')).to.eql(true)
    expect(executionDescription.ctx.userRemit.remove.categories)
      .to.eql(['hr'])
  })

  it('should add/remove todo execution names to/from the remit', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: [],
          teams: [],
          todos: ['a69c0ac9-cde5-11e7-abc4-cec278b6b50a', 'a69c0ad0-cde5-11e7-abc4-cec278b6b50a'],
          formNames: {},
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')

    expect(Object.keys(executionDescription.ctx.userRemit.remove.todos).length).to.eql(1)
    expect(executionDescription.ctx.userRemit.remove.todos)
      .to.eql(['a69c0ad0-cde5-11e7-abc4-cec278b6b50a'])
  })

  it('should add/remove team names to/from the remit', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: [],
          teams: ['Birmingham (Red watch)', 'Another team'],
          todos: [],
          formNames: {},
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(Object.keys(executionDescription.ctx.userRemit.add.teams))
      .to.eql(['Fire Safety (North)'])
    expect(executionDescription.ctx.userRemit.remove.teams)
      .to.eql(['Another team'])
  })

  it('should add/remove form names to/from the remit', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: [],
          teams: [],
          todos: [],
          formNames: {
            test_bookSomeoneSick: '0d6decf12e4ced2f862735be6c3df15543075fd8',
            processAnExpenseClaim: ''
          },
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(Object.keys(executionDescription.ctx.userRemit.add.forms).length).to.eql(3)
    expect(Object.keys(executionDescription.ctx.userRemit.add.forms).includes('test_addIncidentLogEntry')).to.eql(true)
    expect(Object.keys(executionDescription.ctx.userRemit.add.forms).includes('test_addIncidentSafetyRecord')).to.eql(true)
    expect(executionDescription.ctx.userRemit.remove.forms)
      .to.eql(['processAnExpenseClaim'])
    expect(executionDescription.ctx.userRemit.remove.forms.test_bookSomeoneSick).to.eql(undefined)
  })

  it('should add/remove board names to/from the remit', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {
            test_personalDetails: 'WRONGSHASUM',
            test_expenses: ''
          },
          cardNames: {},
          categoryNames: [],
          teams: [],
          todos: [],
          formNames: [],
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(Object.keys(executionDescription.ctx.userRemit.add.boards)).to.eql([
      'test_personalDetails',
      'test_propertyViewer'
    ])
    expect(executionDescription.ctx.userRemit.add.boards.test_personalDetails.shasum).to.not.eql('WRONGSHASUM')
    expect(executionDescription.ctx.userRemit.remove.boards)
      .to.eql(['test_expenses'])
  })

  it('should test shasum remit', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {
            test_expenses: '',
            test_personalDetails: '7f9187a7193896052bd2a97b42c4bc7a4f4f0b60'
          },
          cardNames: {},
          categoryNames: [],
          teams: [],
          todos: [],
          formNames: [],
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')
    expect(Object.keys(executionDescription.ctx.userRemit.add.boards)).to.include('test_propertyViewer')
    expect(executionDescription.ctx.userRemit.remove.boards)
      .to.eql(['test_expenses'])
  })

  it('should remove all the todos in the database', () => {
    return sqlScriptRunner('./db-scripts/todos/setup2.sql', client)
  })

  it('expect empty todo object in remit', async () => {
    const executionDescription = await statebox.startExecution(
      {
        clientManifest: {
          boardNames: {},
          cardNames: {},
          categoryNames: [],
          teams: [],
          todos: [],
          formNames: {},
          startable: []
        }
      },
      GET_USER_REMIT_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.currentStateName).to.eql('GetUserRemit')
    expect(executionDescription.currentResource).to.eql('module:getUserRemit')
    expect(executionDescription.stateMachineName).to.eql(GET_USER_REMIT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('SUCCEEDED')

    expect(Object.keys(executionDescription.ctx.userRemit.add.todos).length).to.eql(0)

    expect(executionDescription.ctx.userRemit.remove).to.eql({})
  })

  it('should tear down the test resources', () => {
    return sqlScriptRunner('./db-scripts/cleanup.sql', client)
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
