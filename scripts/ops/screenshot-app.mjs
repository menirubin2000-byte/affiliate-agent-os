#!/usr/bin/env node
// Open app in browser and take screenshot for verification
// Used by Claude to visually verify the app is working
const pages = [
  { name: 'home', url: 'http://localhost:3000' },
  { name: 'dashboard', url: 'http://localhost:3000/dashboard/he' },
  { name: 'products', url: 'http://localhost:3000/dashboard/products' },
  { name: 'publish-ready', url: 'http://localhost:3000/dashboard/he/publish-ready' },
]

const target = process.argv[2] || 'home'
const page = pages.find(p => p.name === target) || pages[0]
console.log(`Opening ${page.name}: ${page.url}`)
console.log('Use MCP screenshot tool to capture the result.')
