'use strict';

const { createAppServer } = require('./http/server');

const host = '127.0.0.1';
const port = Number(process.env.PORT || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

createAppServer().listen(port, host, () => {
  console.log(`BEAST Family First local demo is available at http://${host}:${port}`);
  console.log('Demo only: do not submit real personal or case information.');
});
