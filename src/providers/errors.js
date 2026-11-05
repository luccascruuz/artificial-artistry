class ImageGenerationError extends Error {
  constructor(message, { reason = 'unknown', cause } = {}) {
    super(message, { cause })
    this.name = 'ImageGenerationError'
    this.reason = reason
  }
}

const MODERATION_PATTERN = /safety|moderation|content policy|nsfw/i
const QUOTA_PATTERN = /quota|allocation|insufficient|balance|budget/i

function reasonFromHttp(status, text = '') {
  if (MODERATION_PATTERN.test(text)) return 'moderation'
  if (status === 402 || QUOTA_PATTERN.test(text)) return 'quota'
  if (status === 429) return 'rate_limit'
  return 'unknown'
}

async function fetchOrThrow(url, init, { timeoutMs = 5 * 60 * 1000, provider }) {
  let response
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (err) {
    throw new ImageGenerationError(`${provider}: falha de rede (${err.message})`, { cause: err })
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new ImageGenerationError(`${provider}: HTTP ${response.status} ${text.slice(0, 300)}`, {
      reason: reasonFromHttp(response.status, text),
    })
  }
  return response
}

module.exports = { ImageGenerationError, reasonFromHttp, fetchOrThrow }
