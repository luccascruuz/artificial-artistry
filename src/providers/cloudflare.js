const { randomInt } = require('node:crypto')
const { required, intEnv } = require('../env')
const { ImageGenerationError, fetchOrThrow } = require('./errors')

const FLUX_SCHNELL = '@cf/black-forest-labs/flux-1-schnell'

function buildBody(model, prompt, size, steps) {
  if (model === FLUX_SCHNELL) {
    return { prompt: prompt.slice(0, 2048), steps }
  }
  return { prompt, width: size.width, height: size.height, seed: randomInt(0, 2 ** 31) }
}

function create({ model }) {
  const accountId = required('CLOUDFLARE_ACCOUNT_ID')
  const apiToken = required('CLOUDFLARE_API_TOKEN')
  const steps = intEnv('CLOUDFLARE_STEPS', 4, { min: 1, max: 8 })
  const selectedModel = model || FLUX_SCHNELL
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${selectedModel}`

  async function generateOne(prompt, size) {
    const response = await fetchOrThrow(
      url,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(buildBody(selectedModel, prompt, size, steps)),
      },
      { provider: 'cloudflare' }
    )

    if (response.headers.get('content-type')?.startsWith('image/')) {
      return Buffer.from(await response.arrayBuffer())
    }

    const json = await response.json()
    const image = json.result?.image
    if (!json.success || !image) {
      const message = json.errors?.map((e) => e.message).join('; ') || 'resposta sem imagem'
      throw new ImageGenerationError(`cloudflare: ${message}`)
    }
    return Buffer.from(image, 'base64')
  }

  return {
    model: selectedModel,

    generate(prompt, { count, size }) {
      return Promise.all(Array.from({ length: count }, () => generateOne(prompt, size)))
    },
  }
}

module.exports = { create }
