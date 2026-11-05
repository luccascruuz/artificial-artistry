const { createHash } = require('node:crypto')
const OpenAI = require('openai')
const { required, optional } = require('../env')
const { ImageGenerationError, reasonFromHttp } = require('./errors')

function safetyIdentifier(userId) {
  return createHash('sha256').update(`telegram:${userId}`).digest('hex')
}

function create({ model }) {
  const client = new OpenAI({
    apiKey: required('OPENAI_API_KEY', 'TOKEN_CHATGPT_IMG'),
    timeout: 5 * 60 * 1000,
    maxRetries: 1,
  })
  const quality = optional('OPENAI_IMAGE_QUALITY', 'medium')

  return {
    model: model || 'gpt-image-2.5-flare',

    async generate(prompt, { count, size, userId }) {
      let response
      try {
        response = await client.images.generate({
          model: this.model,
          prompt,
          n: count,
          size: size.raw,
          quality,
          output_format: 'jpeg',
          output_compression: 90,
          ...(userId && { safety_identifier: safetyIdentifier(userId) }),
        })
      } catch (err) {
        const reason =
          err instanceof OpenAI.APIError
            ? err.code === 'moderation_blocked'
              ? 'moderation'
              : reasonFromHttp(err.status, `${err.code ?? ''} ${err.message ?? ''}`)
            : 'unknown'
        throw new ImageGenerationError(`openai: ${err.message}`, { reason, cause: err })
      }

      return (response.data ?? [])
        .filter((image) => image.b64_json)
        .map((image) => Buffer.from(image.b64_json, 'base64'))
    },
  }
}

module.exports = { create }
