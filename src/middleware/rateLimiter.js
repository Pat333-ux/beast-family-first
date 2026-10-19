function createRateLimiter({
  limit = 10,
  windowMs = 15 * 60 * 1000,
  now = Date.now
} = {}) {
  const clients = new Map();

  return (req, res, next) => {
    const currentTime = now();
    for (const [ip, client] of clients) {
      if (client.resetAt <= currentTime) clients.delete(ip);
    }

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    let client = clients.get(ip);
    if (!client || client.resetAt <= currentTime) {
      client = { count: 0, resetAt: currentTime + windowMs };
      clients.set(ip, client);
    }

    client.count += 1;
    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - client.count)));
    res.set('RateLimit-Reset', String(Math.ceil(client.resetAt / 1000)));

    if (client.count > limit) {
      res.set('Retry-After', String(Math.ceil((client.resetAt - currentTime) / 1000)));
      return res.status(429).json({ error: 'Too many authentication requests' });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
