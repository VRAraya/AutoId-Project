'use strict'

const http = require('http')
const chalk = require('chalk')
const express = require('express')
const debug = require('debug')('autoid:api')

const api = require('./api')

const port = process.env.PORT || 3000
const app = express()
const server = http.createServer(app)

// Middlewares
app.use('/api', api)

// Express Error Handler Middleware
app.use((err, req, res, next) => {
  debug(`Error: ${err.message}`)

  if (err.message.match(/not found/)) {
    return res.status(404).send({ error: err.message })
  }

  res.status(500).send({ error: err.message })
})

function handleFatalError (err) {
  console.error(`${chalk.red(`[fatal error]`)} ${err.message}`)
  console.error(err.stack)
  process.exit(1)
}

if (!module.parent) { // Si no estamos requiriendo el server desde otro lado, entonces se ejecuta esto
  process.on('uncaughtException', handleFatalError)
  process.on('unhandledRejection', handleFatalError)

  server.listen(port, () => {
    console.log(`${chalk.green('[autoid-api]')} server listening on port ${port}`)
  })
}

module.exports = server
