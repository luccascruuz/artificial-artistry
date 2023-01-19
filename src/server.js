const { Telegraf } = require('telegraf')
const { apiChartGpt } = require('./service/apiChartGpt')
require('dotenv').config()

const bot = new Telegraf(process.env.TOKEN_TELEGRAM_BOT);

bot.start(async (ctx) => {
  ctx.reply(`Olá ${ctx.update.message.chat.first_name}, eu sou o Artificial Artistry!\nMe manda qualquer frase que em alguns minutos vou enviar 4 imagens pra você.\n
  Exemplo: "Um robô pintando um quadro muito bonito, arte digital"'
  `)

  ctx.reply("aguarde alguns minutos, enviando...")

  const { imgGenerate } = await apiChartGpt("Um robô pintando um quadro muito bonito, arte digital")

  imgGenerate.forEach(image => ctx.replyWithPhoto({ url: image.url }))
})

bot.on('message', async (msg) => {
  try {
    const { imgGenerate } = await apiChartGpt(msg.update.message.text)
    msg.reply("aguarde alguns minutos, enviando...")
  
    imgGenerate.forEach(image => msg.replyWithPhoto({ url: image.url }))
  } catch(err) {
    msg.reply(`❌ Você não poder pedir imagens desse tipo.`)
  }
});

bot.launch();