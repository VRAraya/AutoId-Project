<template>
  <div>
    <agent
      v-for="agent in agents"
      :uuid="agent.uuid"
      :key="agent.uuid"
      :socket="socket"
    ></agent>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script>
const request = require('request-promise-native')
const io = require('socket.io-client')
const socket = io()
const serverConfig = require('autoid-config')

const config = serverConfig({
  logging: s => debug(s)
})

module.exports = {
  data() {
    return {
      agents: [],
      error: null,
      socket
    }
  },
  mounted() {
    this.initialize()
  },
  methods: {
    async initialize() {
      const options = {
        // prettier-ignore
        'method': 'GET',
        // prettier-ignore
        'url': `${config.web.serverHost}/agents`,
        // prettier-ignore
        'headers': {
          // prettier-ignore
          'Authorization': `Bearer ${config.web.apiToken}`
        },
        // prettier-ignore
        'json': 'true'
      }

      let result
      try {
        result = await request(options)
      } catch (e) {
        this.error = e.error.error
        return
      }

      this.agents = result

      socket.on('agent/connected', payload => {
        const { uuid } = payload.agent

        const existing = this.agents.find(a => a.uuid === uuid)

        if (!existing) {
          this.agents.push(payload.agent)
        }
      })
    }
  }
}
</script>

<style>
body {
  font-family: Arial;
  background: #f8f8f8;
  margin: 0;
}
</style>
