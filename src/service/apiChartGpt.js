const { OpenAIApi, Configuration } = require("openai")
require('dotenv').config()

const configurationChatGpt = new Configuration({
    apiKey: process.env.TOKEN_CHATGPT_IMG
})

const openaiChatGpt = new OpenAIApi(configurationChatGpt)

async function apiChartGpt(text) {
    const { data } = await openaiChatGpt.createImage({
        prompt: text,
        n: 4,
        size: "1024x1024",
    })

    const imgGenerate = data.data

    return { imgGenerate }
}

module.exports = { apiChartGpt }