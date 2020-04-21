/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')
const sqlScriptRunner = require('./fixtures/sql-script-runner.js')

const HEARTBEAT_STATE_MACHINE = 'test_testHeartbeat_1_0'

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason)
  // application specific logging, throwing an error, or other logic here
})

describe('awaitingUserInput state tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let statebox, client, tymlyService

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
          require.resolve('@wmfs/tymly-test-helpers/plugins/allow-everything-rbac-plugin')
        ]
      },
      (err, tymlyServices) => {
        expect(err).to.eql(null)
        statebox = tymlyServices.statebox
        client = tymlyServices.storage.client
        tymlyService = tymlyServices.tymly
        done()
      }
    )
  })

  it('should execute awaitingHumanInput state machine and expect defaults to come through', async () => {
    const executionDescription = await statebox.startExecution(
      {},
      HEARTBEAT_STATE_MACHINE,
      {
        sendResponse: 'AFTER_RESOURCE_CALLBACK.TYPE:awaitingHumanInput'
      }
    )

    expect(executionDescription.currentStateName).to.eql('TestHeartbeat')
    expect(executionDescription.currentResource).to.eql('module:awaitingHumanInput')
    expect(executionDescription.stateMachineName).to.eql(HEARTBEAT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('RUNNING')
    expect(executionDescription.ctx.requiredHumanInput.data.empNo).to.eql(0)
    expect(executionDescription.ctx.requiredHumanInput.data.status).to.eql('Probationary')
  })

  it('should overwrite any default values if config passed in', async () => {
    const executionDescription = await statebox.startExecution(
      {
        someDefaultFormData: {
          empNo: 14345,
          status: 'Permanent'
        }
      },
      HEARTBEAT_STATE_MACHINE,
      {
        sendResponse: 'AFTER_RESOURCE_CALLBACK.TYPE:awaitingHumanInput'
      }
    )

    expect(executionDescription.currentStateName).to.eql('TestHeartbeat')
    expect(executionDescription.currentResource).to.eql('module:awaitingHumanInput')
    expect(executionDescription.stateMachineName).to.eql(HEARTBEAT_STATE_MACHINE)
    expect(executionDescription.status).to.eql('RUNNING')
    expect(executionDescription.ctx.requiredHumanInput.data.empNo).to.eql(14345)
    expect(executionDescription.ctx.requiredHumanInput.data.status).to.eql('Permanent')
  })

  it('should watch a board for this user', async () => {
    const executionDescription = await statebox.startExecution(
      {
        stateMachineName: 'test_getBoards_1_0',
        title: 'Incident 1/1999',
        description: 'Fire with 0 casualties and 0 fatalities',
        boardKeys: {
          incidentNumber: 1,
          incidentYear: 1999
        }
      },
      'tymly_watchBoard_1_0',
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.ctx.feedName).to.eql('test_getBoards_1_0|1|1999')
  })

  it('should check the required human input if the user is watching the board', async () => {
    const executionDescription = await statebox.startExecution(
      {
        boardKeys: {
          incidentNumber: 1,
          incidentYear: 1999
        }
      },
      'test_getBoards_1_0',
      {
        sendResponse: 'AFTER_RESOURCE_CALLBACK.TYPE:awaitingHumanInput',
        userId: 'test-user'
      }
    )

    expect(Object.keys(executionDescription.ctx.requiredHumanInput)
      .includes('watchBoardSubscriptionId'))
    expect(executionDescription.ctx.requiredHumanInput.feedName)
      .to.eql('test_getBoards_1_0|1|1999')
  })

  it('should tear down the test resources', () => {
    return sqlScriptRunner('./db-scripts/cleanup.sql', client)
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
