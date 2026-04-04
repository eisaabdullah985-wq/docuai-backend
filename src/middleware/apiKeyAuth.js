/**
 * API key authentication middleware.
 *
 * Every request to protected routes must include:
 *   x-api-key: <value matching API_KEY env var>
 *
 * Returns 401 Unauthorized if the key is missing or incorrect.
 */
const apiKeyAuth = (req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  const serverKey = process.env.API_KEY;

  if (!serverKey) {
    // Misconfiguration — fail safe
    return res.status(500).json({
      status: 'error',
      message: 'Server API key is not configured.',
    });
  }

  if (!clientKey || clientKey !== serverKey) {
    return res.status(401).json({
      status: 'error',
      message: 'Unauthorized. Provide a valid API key in the x-api-key header.',
    });
  }

  next();
};

module.exports = apiKeyAuth;