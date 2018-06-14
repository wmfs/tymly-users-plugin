/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')
const sqlScriptRunner = require('./fixtures/sql-script-runner.js')

describe('get-board-data tymly-users-plugin tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let tymlyService, statebox, client, animalModel, humanModel, boardService, formService
  const GET_SINGLE_BOARD_STATE_MACHINE = 'test_getSingleBoard_1_0'
  const GET_MULTIPLE_BOARDS_STATE_MACHINE = 'test_getMultipleBoards_1_0'

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
          require.resolve('@wmfs/tymly-solr-plugin')
        ]
      },
      (err, tymlyServices) => {
        expect(err).to.eql(null)
        tymlyService = tymlyServices.tymly
        statebox = tymlyServices.statebox
        client = tymlyServices.storage.client
        animalModel = tymlyServices.storage.models['test_animal']
        humanModel = tymlyServices.storage.models['test_human']
        boardService = tymlyServices.boards
        formService = tymlyServices.forms
        done()
      }
    )
  })

  it('should ensure each form has a shasum associated with it', () => {
    Object.keys(formService.forms).forEach(form => {
      expect(formService.forms[form].shasum)
    })
  })

  it('should ensure each board has a shasum associated with it', () => {
    Object.keys(boardService.boards).forEach(board => {
      expect(boardService.boards[board].shasum)
    })
  })

  it('insert some \'human\' test data', async () => {
    await humanModel.create({
      name: 'Alfred',
      age: '57'
    })
  })

  it('insert some \'animal\' test data', async () => {
    await animalModel.create({
      name: 'Alfred',
      age: '2',
      type: 'dog'
    })
  })

  it('run state machine to get board data from one table', async () => {
    const executionDescription = await statebox.startExecution(
      {
        boardKeys: {
          name: 'Alfred'
        }
      },
      GET_SINGLE_BOARD_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.ctx.data.name).to.eql('Alfred')
    expect(executionDescription.ctx.data.age).to.eql('57')
  })

  it('run state machine to get board data from two tables', async () => {
    const executionDescription = await statebox.startExecution(
      {
        boardKeys: {
          name: 'Alfred'
        }
      },
      GET_MULTIPLE_BOARDS_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.ctx.data.human.age).to.eql('57')
    expect(executionDescription.ctx.data.animal.type).to.eql('dog')
  })

  it('run state machine with no input - single', async () => {
    const executionDescription = await statebox.startExecution(
      {},
      GET_SINGLE_BOARD_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.ctx.data).to.eql({})
  })

  it('run state machine with no input - multiple', async () => {
    const executionDescription = await statebox.startExecution(
      {},
      GET_MULTIPLE_BOARDS_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      }
    )

    expect(executionDescription.ctx.data).to.eql({})
  })

  it('should tear down the test resources', () => {
    return sqlScriptRunner('./db-scripts/cleanup.sql', client)
  })

  it('should shut down Tymly', async () => {
    await tymlyService.shutdown()
  })
})
