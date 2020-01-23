'use strict'

const debug = require('debug')('autoid:api:tests')
const test = require('ava')
const util = require('util')
const request = require('supertest')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const agentFixtures = require('./fixtures/agent')
const serverConfig = require('autoid-config')
const auth = require('../auth')
const sign = util.promisify(auth.sign)

let sandbox = null
let server = null
let dbStub = null
let token = null
const AgentStub = {}
const MetricStub = {}

const config = serverConfig({
  logging: s => debug(s)
})

test.beforeEach(async () => {
  sandbox = sinon.createSandbox()

  dbStub = sandbox.stub()
  dbStub.returns(
    Promise.resolve({
      Agent: AgentStub,
      Metric: MetricStub
    })
  )

  AgentStub.findConnected = sandbox.stub()
  AgentStub.findConnected.returns(Promise.resolve(agentFixtures.connected))

  token = await sign({ admin: true, username: 'root' }, config.auth.secret)

  const api = proxyquire('../api', {
    'autoid-db': dbStub
  })

  server = proxyquire('../server', {
    './api': api
  })
})

test.afterEach(() => {
  sandbox && sinon.resetHistory()
})

test.serial.cb('/api/agents', t => {
  request(server)
    .get('/api/agents')
    .set('Authorization', `Bearer ${token}`)
    .expect(200)
    .expect('Content-Type', /json/)
    .end((err, res) => {
      t.falsy(err, 'should not return an error')
      const body = JSON.stringify(res.body)
      const expected = JSON.stringify(agentFixtures.connected)
      t.deepEqual(body, expected, 'response body should be the expected')
      t.end()
    })
})

test.serial.todo('/api/agents - not authorized')

test.serial.todo('/api/agent/:uuid')
test.serial.todo('/api/agent/:uuid - not found')

test.serial.todo('/api/metrics/:uuid')
test.serial.todo('/api/metrics/:uuid - not found')

test.serial.todo('/api/metrics/:uuid/:type')
test.serial.todo('/api/metrics/:uuid/:type - not found')
