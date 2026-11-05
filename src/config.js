const { required, optional, intEnv, listEnv, sizeEnv } = require('./env')

const config = {
  telegramToken: required('TOKEN_TELEGRAM_BOT'),

  image: {
    provider: optional('IMAGE_PROVIDER', 'openai').toLowerCase(),
    model: optional('IMAGE_MODEL'),
    size: sizeEnv('IMAGE_SIZE', '1024x1024'),
    count: intEnv('IMAGE_COUNT', 4, { min: 1, max: 10 }),
  },

  maxPromptLength: intEnv('MAX_PROMPT_LENGTH', 1000, { min: 10, max: 32000 }),
  cooldownSeconds: intEnv('COOLDOWN_SECONDS', 60, { min: 0, max: 86400 }),
  allowedUserIds: new Set(listEnv('ALLOWED_USER_IDS')),
}

module.exports = { config }
