const { config } = require('../config')
const { createProvider } = require('../providers')
const { ImageGenerationError } = require('../providers/errors')

const provider = createProvider(config.image.provider, { model: config.image.model })

async function generateImages(prompt, { userId } = {}) {
  let images
  try {
    images = await provider.generate(prompt, {
      count: config.image.count,
      size: config.image.size,
      userId,
    })
  } catch (err) {
    if (err instanceof ImageGenerationError) throw err
    throw new ImageGenerationError(err.message, { cause: err })
  }

  if (!images?.length) {
    throw new ImageGenerationError(`${provider.name}: nenhuma imagem retornada`)
  }
  return images
}

module.exports = { generateImages, ImageGenerationError, provider }
