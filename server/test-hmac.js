const crypto = require('crypto');
const secret = 'secretCode123';
const payload = Buffer.from('Hello, World!', 'utf-8');
const hmac = crypto.createHmac('sha256', secret);
hmac.update(payload);
console.log('digest:', 'sha256=' + hmac.digest('hex'));
