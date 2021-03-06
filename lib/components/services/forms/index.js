'use strict'

const path = require('path')
const shasum = require('shasum')
const formMaker = require('@wmfs/form-maker')
const jsonfile = require('jsonfile')
const fs = require('fs')
const _ = require('lodash')

class FormsService {
  /**
   * Boot function to expose Forms service class
   * @param {object} options
   * @param {function} callback Callback function for when boot is complete
   */
  boot (options, callback) {
    this.forms = {}

    const formDefinitions = options.blueprintComponents.forms || {}
    const promises = []

    Object.keys(formDefinitions).map(formId => {
      const formDef = formDefinitions[formId]
      if (formDef.ext === '.yml') {
        formId = formDef.namespace + '_' + _.camelCase(path.basename(formDef.filePath, '.yml'))
        if (!Object.keys(formDefinitions).includes(formId)) {
          const meta = {
            yamlPath: formDef.filePath,
            namespace: _.camelCase(formDef.namespace)
          }
          meta.formName = _.camelCase(path.basename(meta.yamlPath, '.yml'))
          meta.modelName = _.camelCase(path.basename(meta.yamlPath, '.yml'))

          const blueprintPath = meta.yamlPath.split(path.join('forms', _.kebabCase(meta.formName) + '.yml'))[0]
          if (!fs.existsSync(path.resolve(blueprintPath, 'state-machines'))) fs.mkdirSync(path.resolve(blueprintPath, 'state-machines'))
          if (!fs.existsSync(path.resolve(blueprintPath, 'models'))) fs.mkdirSync(path.resolve(blueprintPath, 'models'))

          promises.push(this.writeBlueprintFiles(options, meta, blueprintPath))
        }
      } else if (!this.forms[formId]) {
        formDef.shasum = shasum(formDef)
        this.forms[formId] = formDef
      }
    })

    Promise.all(promises)
      .then(results => {
        results.map(res => {
          const formDef = {
            jsonSchema: res.jsonSchema,
            namespace: Object.keys(res)[0].split('_')[0],
            id: Object.keys(res)[0].split('_')[1],
            name: Object.keys(res)[0].split('_')[1]
          }
          formDef.shasum = shasum(formDef)
          this.forms[Object.keys(res)[0]] = formDef
        })
        callback(null)
      })
      .catch(err => callback(err))
  }

  // TODO: Create the categories if needed - categories can be found at result.categories (it's an array)
  /**
   * Writes various blueprint files to appropriate directories e.g. forms, state-machines, models
   * @param {Object} options Object outlining dir structure of write locations
   * @param {Object} meta Meta object of file metadata
   * @param {String} blueprintPath Path of where to write blueprint files
   * @example
   * writeBlueprintFiles(options, meta, blueprintPath)
   * */
  writeBlueprintFiles (options, meta, blueprintPath) {
    return new Promise((resolve, reject) => {
      formMaker(meta, (err, result) => {
        if (err) return reject(err)
        jsonfile.writeFile(path.resolve(blueprintPath, 'forms', _.kebabCase(meta.formName) + '.json'), result.form, {
          spaces: 2,
          EOL: '\n'
        }, err => {
          if (err) return reject(err)
          jsonfile.writeFile(path.resolve(blueprintPath, 'state-machines', _.kebabCase(meta.formName) + '.json'), result.stateMachine, {
            spaces: 2,
            EOL: '\n'
          }, err => {
            if (err) return reject(err)
            if (!options.blueprintComponents.models[`${meta.namespace}_${meta.modelName}`]) {
              jsonfile.writeFile(path.resolve(blueprintPath, 'models', _.kebabCase(meta.modelName) + '.json'), result.model, {
                spaces: 2,
                EOL: '\n'
              }, err => {
                if (err) return reject(err)
                options.blueprintComponents.models[`${meta.namespace}_${meta.modelName}`] = getModelDefinition(result.model, meta)
                options.blueprintComponents.stateMachines[`${meta.namespace}_${meta.formName}_1_0`] = getStateMachineDefinition(result.stateMachine, meta)
                resolve({ [`${meta.namespace}_${meta.formName}`]: result.form })
              })
            } else {
              resolve({ [`${meta.namespace}_${meta.formName}`]: result.form })
            }
          })
        })
      })
    })
  }
}

/**
 * Mangles model and metadata to return a shaped model definition
 * @param {Object} model Contains various model related info
 * @param {Object} meta Object of file metadata
 * @returns {Object} Shaped model definition
 * @example
 * const modelDef = getModelDefinition(model, meta)
 * */
function getModelDefinition (model, meta) {
  return {
    title: model.title,
    description: model.description,
    type: 'object',
    properties: model.properties,
    namespace: meta.namespace,
    id: meta.modelName,
    name: meta.modelName
  }
}

/**
 * Mangles stateMachine data and metadata to return a shaped state-machine definition
 * @param {Object} stateMachine Contains various state-machine related info
 * @param {Object} meta Object of file metadata
 * @returns {Object} Shaped stateMachine definition
 * @example
 * const stateMachineDef = getStateMachineDefinition(stateMachine, meta)
 * */
function getStateMachineDefinition (stateMachine, meta) {
  stateMachine.namespace = meta.namespace
  stateMachine.id = meta.formName
  return stateMachine
}

module.exports = {
  serviceClass: FormsService,
  refProperties: {
    formId: 'forms'
  },
  bootBefore: ['tymly', 'rbac', 'storage']
}
