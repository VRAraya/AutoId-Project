'use strict'

if (process.env.NODE_ENV !== 'production') {
  require('longjohn')
}
const debug = require('debug')('autoid:mqtt')
const mosca = require('mosca')
const redis = require('redis')
const chalk = require('chalk')
const serverConfig = require('autoid-config')
const db = require('autoid-db')

const { parsePayload, handleFatalError, handleError } = require('autoid-utils')

const backend = {
  type: 'redis',
  redis,
  return_buffers: true
}
const settings = {
  port: 1883,
  backend
}

const config = serverConfig({
  logging: s => debug(s)
})

const server = new mosca.Server(settings)
const clients = new Map()

let Agent, Metric

server.on('clientConnected', client => {
  debug(`Client Connected: ${client.id}`)
  clients.set(client.id, null)
})

server.on('clientDisconnected', async client => {
  debug(`Client Disconnected: ${client.id}`)
  const agent = clients.get(client.id)

  if (agent) {
    // Mark Agent as Disconnected
    agent.connected = false

    try {
      await Agent.createOrUpdate(agent)
    } catch (e) {
      return handleError(e)
    }

    // Delete Agent from Clients List
    clients.delete(client.id)

    server.publish({
      topic: 'agent/disconnected',
      payload: JSON.stringify({
        agent: {
          uuid: agent.uuid
        }
      })
    })
    debug(
      `Client (${client.id}) assciated to Agent (${agent.uuid}) marked as disconnected`
    )
  }
})

server.on('published', async (packet, client) => {
  debug(`Received: ${packet.topic}`)

  switch (packet.topic) {
    case 'agent/connected':
    case 'agent/disconnected':
      debug(`Payload: ${packet.payload}`)
      break
    case 'agent/message':
      debug(`Payload: ${packet.payload}`)

      const payload = parsePayload(packet.payload)

      if (payload) {
        payload.agent.connected = true

        let agent
        try {
          agent = await Agent.createOrUpdate(payload.agent)
        } catch (e) {
          return handleError(e)
        }

        debug(`Agent ${agent.uuid} saved`)

        // Notify Agent is Connected
        if (!clients.get(client.id)) {
          clients.set(client.id, agent)
          server.publish({
            topic: 'agent/connected',
            payload: JSON.stringify({
              agent: {
                uuid: agent.uuid,
                name: agent.name,
                hostname: agent.hostname,
                pid: agent.pid,
                connected: agent.connected
              }
            })
          })
        }

        // Store Metrics
        const saveMetricsPromises = payload.metrics.map(async metric => {
          let createdMetric

          try {
            createdMetric = await Metric.create(agent.uuid, metric)
          } catch (e) {
            return handleError(e)
          }
          debug(`Metric ${createdMetric.id} saved on agent ${agent.uuid}`)
        })

        Promise.all(saveMetricsPromises).catch(handleError)
      }
      break
  }

  debug(`Payload: ${packet.payload}`)
})

server.on('ready', async () => {
  const services = await db(config.db).catch(handleFatalError)

  Agent = services.Agent
  Metric = services.Metric

  console.log(`${chalk.green('[autoid-mqtt]')} server is running`)
})

server.on('error', handleFatalError)

process.on('uncaughtException', handleFatalError)
process.on('unhandledRejection', handleFatalError)
