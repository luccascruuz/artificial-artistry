const { fail } = require('../env')

const providers = {
  openai: () => require('./openai'),
  cloudflare: () => require('./cloudflare'),
  pollinations: () => require('./pollinations'),
}

function createProvider(name, options) {
  const load = providers[name]
  if (!load) {
    fail(`IMAGE_PROVIDER inválido: "${name}". Opções: ${Object.keys(providers).join(', ')}`)
  }
  return { name, ...load().create(options) }
}

module.exports = { createProvider, availableProviders: Object.keys(providers) }
