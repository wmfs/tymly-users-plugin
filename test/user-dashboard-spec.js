/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const process = require('process')
const expect = require('chai').expect

const GET_USER_DASHBOARD_STATE_MACHINE = 'tymly_getUserDashboardData_1_0'

describe('user dashboard data tymly-users-plugin tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let statebox, tymlyService

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
        tymlyService = tymlyServices.tymly
        done()
      }
    )
  })

  it('should start the state machine to get user dashboard data', done => {
    statebox.startExecution(
      {},
      GET_USER_DASHBOARD_STATE_MACHINE,
      {
        sendResponse: 'COMPLETE',
        userId: 'test-user'
      },
      (err, executionDescription) => {
        expect(err).to.eql(null)

        expect(executionDescription.currentStateName).to.eql('GetUserDashboardData')
        expect(executionDescription.currentResource).to.eql('module:getUserDashboardData')
        expect(executionDescription.stateMachineName).to.eql(GET_USER_DASHBOARD_STATE_MACHINE)
        expect(executionDescription.status).to.eql('SUCCEEDED')
        done()
      }
    )
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
