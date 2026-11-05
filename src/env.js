function fail(message) {
  console.error(`❌ ${message}`)
  process.exit(1)
}

function required(name, ...fallbacks) {
  for (const key of [name, ...fallbacks]) {
    if (process.env[key]) return process.env[key]
  }
  fail(`Variável de ambiente obrigatória ausente: ${name} (veja o .env.example)`)
}

function optional(name, defaultValue) {
  const value = process.env[name]
  return value === undefined || value === '' ? defaultValue : value
}

function intEnv(name, defaultValue, { min, max }) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return defaultValue
  const value = Number.parseInt(raw, 10)
  if (Number.isNaN(value) || value < min || value > max) {
    fail(`${name} deve ser um inteiro entre ${min} e ${max} (recebido: "${raw}")`)
  }
  return value
}

function listEnv(name) {
  return (process.env[name] || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function sizeEnv(name, defaultValue) {
  const raw = optional(name, defaultValue)
  const match = /^(\d+)x(\d+)$/.exec(raw)
  if (!match) fail(`${name} deve estar no formato LARGURAxALTURA, ex: 1024x1024 (recebido: "${raw}")`)
  return { width: Number(match[1]), height: Number(match[2]), raw }
}

module.exports = { fail, required, optional, intEnv, listEnv, sizeEnv }
