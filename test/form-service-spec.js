/* eslint-env mocha */

'use strict'

const tymly = require('tymly')
const path = require('path')
const expect = require('chai').expect
const sqlScriptRunner = require('./fixtures/sql-script-runner.js')

describe('Form Service tymly-users-plugin tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let tymlyService, client, storage, forms

  it('should create some basic tymly services', function (done) {
    tymly.boot(
      {
        blueprintPaths: [
          path.resolve(__dirname, 'fixtures', 'people-blueprint')
        ],
        pluginPaths: [
          path.resolve(__dirname, './../lib'),
          require.resolve('tymly-pg-plugin'),
          require.resolve('tymly-solr-plugin')
        ]
      },
      function (err, tymlyServices) {
        expect(err).to.eql(null)
        tymlyService = tymlyServices.tymly
        storage = tymlyServices.storage
        forms = tymlyServices.forms
        client = tymlyServices.storage.client
        done()
      }
    )
  })

  it('should check the storage', (done) => {
    expect(Object.keys(storage.models).includes('test_people')).to.eql(true)
    done()
  })

  it('should check the forms', (done) => {
    expect(Object.keys(forms.forms).includes('test_people')).to.eql(true)
    done()
  })

  it('should clean up the test resources', () => {
    return sqlScriptRunner('./db-scripts/cleanup.sql', client)
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
