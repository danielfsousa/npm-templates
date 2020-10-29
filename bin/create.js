#!/usr/bin/env node

const main = require('../src/main')

main().catch(err => {
  console.error(err)
  process.exit(1)
})
