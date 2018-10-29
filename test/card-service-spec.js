/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')
const sqlScriptRunner = require('./fixtures/sql-script-runner.js')

describe('Card Service tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let tymlyService, client, cardService

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
        tymlyService = tymlyServices.tymly
        cardService = tymlyServices.cards
        client = tymlyServices.storage.client
        done()
      }
    )
  })

  it('should check the card service contains the simple card', () => {
    expect(cardService.cards).to.have.own.property('test_simple')
  })

  it(`should expect the simple card to contain it's widgets`, () => {
    expect(cardService.cards.test_simple).to.have.own.property('widgets')
  })

  it(`should expect the simple card to contain a shasum`, () => {
    expect(cardService.cards.test_simple).to.have.own.property('shasum')
  })

  it('should tear down the test resources', () => {
    return sqlScriptRunner('./db-scripts/cleanup.sql', client)
  })

  it('should shut down Tymly', async () => {
    await tymlyService.shutdown()
  })
})
