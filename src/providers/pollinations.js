const { randomInt } = require('node:crypto')
const { setTimeout: sleep } = require('node:timers/promises')
const { optional } = require('../env')
const { fetchOrThrow } = require('./errors')

const ANONYMOUS_INTERVAL_MS = 46 * 1000
const MAX_ANONYMOUS_PIXELS = 768 * 768

function fitToAnonymousLimit({ width, height }) {
  const scale = Math.min(1, Math.sqrt(MAX_ANONYMOUS_PIXELS / (width * height)))
  return { width: Math.floor(width * scale), height: Math.floor(height * scale) }
}

function createQueue(minIntervalMs) {
  let tail = Promise.resolve()
  let lastRun = 0

  return (task) => {
    const run = tail.then(async () => {
      const wait = lastRun + minIntervalMs - Date.now()
      if (wait > 0) await sleep(wait)
      try {
        return await task()
      } finally {
        lastRun = Date.now()
      }
    })
    tail = run.catch(() => {})
    return run
  }
}

function create({ model }) {
  const apiKey = optional('POLLINATIONS_API_KEY')
  const seed = () => randomInt(0, 2 ** 31)

  if (apiKey) {
    const selectedModel = model || 'black-forest-labs/flux.1-schnell'

    async function generateOne(prompt) {
      const params = new URLSearchParams({ model: selectedModel, seed: String(seed()) })
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`
      const response = await fetchOrThrow(
        url,
        { headers: { Authorization: `Bearer ${apiKey}` } },
        { provider: 'pollinations' }
      )
      return Buffer.from(await response.arrayBuffer())
    }

    return {
      model: selectedModel,
      generate: (prompt, { count }) =>
        Promise.all(Array.from({ length: count }, () => generateOne(prompt))),
    }
  }

  const enqueue = createQueue(ANONYMOUS_INTERVAL_MS)

  async function generateAnonymous(prompt, size) {
    const { width, height } = fitToAnonymousLimit(size)
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(seed()),
    })
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`
    const response = await fetchOrThrow(url, {}, { provider: 'pollinations' })
    return Buffer.from(await response.arrayBuffer())
  }

  return {
    model: 'classic (anônimo)',

    async generate(prompt, { count, size }) {
      const images = []
      for (let i = 0; i < count; i++) {
        images.push(await enqueue(() => generateAnonymous(prompt, size)))
      }
      return images
    },
  }
}

module.exports = { create }
