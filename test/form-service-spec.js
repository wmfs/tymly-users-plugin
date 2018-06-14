/* eslint-env mocha */

'use strict'

const tymly = require('@wmfs/tymly')
const path = require('path')
const expect = require('chai').expect
const process = require('process')
const sqlScriptRunner = require('./fixtures/sql-script-runner.js')
const fs = require('fs')

describe('Form Service tymly-users-plugin tests', function () {
  this.timeout(process.env.TIMEOUT || 5000)
  let tymlyService, client, forms, storage, statebox

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
          path.resolve(__dirname, 'fixtures', 'people-blueprint')
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
        storage = tymlyServices.storage
        forms = tymlyServices.forms
        client = tymlyServices.storage.client
        statebox = tymlyServices.statebox
        done()
      }
    )
  })

  it('should check the properties of the forms', () => {
    expect(Object.keys(forms.forms).includes('test_people')).to.eql(true)
  })

  it('should check the properties of the storage model', () => {
    expect(Object.keys(storage.models).includes('test_people')).to.eql(true)
    expect(storage.models['test_people'].propertyIds).to.eql(['firstName',
      'lastName',
      'age',
      'dateOfBirth',
      'homeAddress',
      'avatar',
      'favouriteColour',
      'id'])
  })

  it('should check the state machine', () => {
    expect(statebox.statebox.options.blueprintComponents.stateMachines['test_people_1_0'].Comment).to.eql('A bunch of people.')
  })

  it('should clean up the generated files', () => {
    fs.unlinkSync(path.resolve(__dirname, 'fixtures', 'people-blueprint', 'forms', 'people.json'))
    fs.unlinkSync(path.resolve(__dirname, 'fixtures', 'people-blueprint', 'models', 'people.json'))
    fs.unlinkSync(path.resolve(__dirname, 'fixtures', 'people-blueprint', 'state-machines', 'people.json'))
    fs.unlinkSync(path.resolve(__dirname, 'fixtures', 'people-blueprint', 'forms', 'cats.json'))
    fs.unlinkSync(path.resolve(__dirname, 'fixtures', 'people-blueprint', 'state-machines', 'cats.json'))
    fs.rmdirSync(path.resolve(__dirname, 'fixtures', 'people-blueprint', 'state-machines'))
  })

  it('should clean up the test resources', () => {
    return sqlScriptRunner('./db-scripts/cleanup.sql', client)
  })

  it('should shut down Tymly nicely', async () => {
    await tymlyService.shutdown()
  })
})
