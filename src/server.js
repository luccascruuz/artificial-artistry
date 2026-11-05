const { Telegraf } = require('telegraf')
const { message } = require('telegraf/filters')
const { config } = require('./config')
const { generateImages, provider } = require('./services/imageGenerator')

const bot = new Telegraf(config.telegramToken)

const plural = (n, singular, pluralForm = `${singular}s`) =>
  `${n} ${n === 1 ? singular : pluralForm}`
const imagesLabel = plural(config.image.count, 'imagem', 'imagens')

const HELP_TEXT =
  `Me manda qualquer frase que eu gero ${imagesLabel} pra você.\n\n` +
  'Exemplo: "Um robô pintando um quadro muito bonito, arte digital"\n\n' +
  'Dica: quanto mais detalhes (estilo, cores, iluminação, ângulo), melhor o resultado.'

const inProgress = new Set()
const lastRequestAt = new Map()

function isAllowed(userId) {
  return config.allowedUserIds.size === 0 || config.allowedUserIds.has(String(userId))
}

function secondsUntilAllowed(userId) {
  const last = lastRequestAt.get(userId)
  if (!last) return 0
  const remainingMs = last + config.cooldownSeconds * 1000 - Date.now()
  return Math.max(0, Math.ceil(remainingMs / 1000))
}

function keepUploadingStatus(ctx) {
  const send = () => ctx.sendChatAction('upload_photo').catch(() => {})
  send()
  const interval = setInterval(send, 4500)
  return () => clearInterval(interval)
}

async function sendImages(ctx, images, prompt) {
  const caption = `🎨 ${prompt}`.slice(0, 1024)

  if (images.length === 1) {
    await ctx.replyWithPhoto({ source: images[0] }, { caption })
    return
  }

  await ctx.replyWithMediaGroup(
    images.map((source, index) => ({
      type: 'photo',
      media: { source },
      ...(index === 0 && { caption }),
    }))
  )
}

const ERROR_MESSAGES = {
  moderation: '🚫 Esse pedido foi bloqueado pelo filtro de segurança. Tente descrever de outra forma.',
  rate_limit: '⏳ Muitas solicitações no momento. Tente novamente em alguns minutos.',
  quota: '📉 O limite de geração de imagens foi atingido. Tente novamente mais tarde.',
  unknown: '❌ Não consegui gerar a imagem, tente novamente em alguns minutos...',
}

async function handleGeneration(ctx, prompt) {
  const userId = ctx.from.id
  inProgress.add(userId)
  lastRequestAt.set(userId, Date.now())

  const stopStatus = keepUploadingStatus(ctx)
  try {
    await ctx.reply('🎨 Gerando suas imagens, isso pode levar alguns instantes...')
    const images = await generateImages(prompt, { userId })
    await sendImages(ctx, images, prompt)
  } catch (err) {
    console.error(`[user ${userId}] Falha ao gerar imagem:`, err.reason ?? '', err.message)
    lastRequestAt.delete(userId)
    await ctx.reply(ERROR_MESSAGES[err.reason] ?? ERROR_MESSAGES.unknown).catch(() => {})
  } finally {
    stopStatus()
    inProgress.delete(userId)
  }
}

bot.use(async (ctx, next) => {
  if (ctx.from && !isAllowed(ctx.from.id)) {
    return ctx.reply('🔒 Este bot é privado.').catch(() => {})
  }
  return next()
})

bot.start((ctx) =>
  ctx.reply(`Olá ${ctx.from.first_name}, eu sou o Artificial Artistry! 🤖\n\n${HELP_TEXT}`)
)

bot.help((ctx) => ctx.reply(HELP_TEXT))

bot.on(message('text'), (ctx) => {
  const prompt = ctx.message.text.trim()
  const userId = ctx.from.id

  if (prompt.startsWith('/')) {
    return ctx.reply('Comando não reconhecido. Use /help para ver como me usar.')
  }
  if (prompt.length > config.maxPromptLength) {
    return ctx.reply(`✂️ Texto muito longo. Use no máximo ${config.maxPromptLength} caracteres.`)
  }
  if (inProgress.has(userId)) {
    return ctx.reply('⏳ Ainda estou gerando suas imagens anteriores, aguarde um pouco.')
  }
  const wait = secondsUntilAllowed(userId)
  if (wait > 0) {
    return ctx.reply(`⏳ Aguarde ${plural(wait, 'segundo')} antes de pedir novas imagens.`)
  }

  handleGeneration(ctx, prompt)
})

bot.on(message(), (ctx) => ctx.reply('Por enquanto só entendo mensagens de texto. ' + HELP_TEXT))

bot.catch((err, ctx) => {
  console.error(`Erro ao processar update ${ctx.update.update_id}:`, err)
})

bot
  .launch(() => console.log(`✅ Bot iniciado (provedor: ${provider.name}, modelo: ${provider.model})`))
  .catch((err) => {
    console.error('❌ Falha ao iniciar o bot:', err.message)
    process.exit(1)
  })

process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
