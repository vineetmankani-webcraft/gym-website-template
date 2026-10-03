const os = require('node:os')

const userInfo = os.userInfo
os.userInfo = function safeUserInfo(options) {
  try {
    return userInfo.call(os, options)
  } catch (error) {
    if (!error || error.code !== 'ERR_SYSTEM_ERROR') throw error
    return {
      uid: -1,
      gid: -1,
      username: process.env.USERNAME || process.env.USER || 'local-user',
      homedir: process.env.USERPROFILE || process.cwd(),
      shell: null,
    }
  }
}

require('node:module').syncBuiltinESMExports()
