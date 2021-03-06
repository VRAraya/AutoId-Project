'use strict'

const db = require('../')
const exampleConfig = require('autoid-config')
const { handleFatalError } = require('autoid-utils')

async function run () {
  const config = exampleConfig()

  const { Agent, Metric } = await db(config.db).catch(handleFatalError)

  const agent = await Agent.createOrUpdate({
    uuid: 'yyyz',
    name: 'test',
    username: 'test',
    hostname: 'test',
    pid: 1,
    connected: true
  }).catch(handleFatalError)

  console.log('--agent--')
  console.log(agent)

  const agents = await Agent.findAll().catch(handleFatalError)
  console.log('--agents--')
  console.log(agents)

  const metrics = await Metric.findByAgentUuid(agent.uuid).catch(
    handleFatalError
  )
  console.log('--metrics--')
  console.log(metrics)

  const metric = await Metric.create(agent.uuid, {
    type: 'memory',
    value: '300'
  }).catch(handleFatalError)

  console.log('--metric--')
  console.log(metric)

  const metricsByType = await Metric.findByTypeAgentUuid(
    'memory',
    agent.uuid
  ).catch(handleFatalError)
  console.log('--metrics--')
  console.log(metricsByType)
}

run()
