const path = require('node:path')
const { spawn } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const fallback = path.join(__dirname, 'userinfo-fallback.cjs')
const existingOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : ''
const child = spawn(process.execPath, [path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs'), path.join(__dirname, 'dev-admin.ts')], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: `${existingOptions}--require=${fallback}` },
})

child.on('exit', code => process.exit(code ?? 0))
