process.env.JWT_SECRET = 'test-secret';
process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(64);
const jwt = require('jsonwebtoken');
module.exports.tokenFor = (role, sub = '11111111-1111-1111-1111-111111111111') =>
  'Bearer ' + jwt.sign({ sub, role }, 'test-secret');
