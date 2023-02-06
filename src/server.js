const { Telegraf } = require('telegraf')
const { apiChartGpt } = require('./service/apiChartGpt')
require('dotenv').config()

const bot = new Telegraf(process.env.TOKEN_TELEGRAM_BOT);

bot.start(async (ctx) => {
  ctx.reply(`Olá ${ctx.update.message.chat.first_name}, eu sou o Artificial Artistry!\nMe manda qualquer frase que em alguns minutos vou enviar 4 imagens pra você.\n
  Exemplo: "Um robô pintando um quadro muito bonito, arte digital"'
  `)
})

bot.on('message', async (msg) => {
  try {
    const { imgGenerate } = await apiChartGpt(msg.update.message.text)
    msg.reply("aguarde alguns minutos, enviando...")
  
    imgGenerate.forEach(image => msg.replyWithPhoto({ url: image.url }))
  } catch(err) {
    msg.reply(`❌ Imagem não gerada, tente novamente em alguns minutos...`)
  }
});

bot.launch();