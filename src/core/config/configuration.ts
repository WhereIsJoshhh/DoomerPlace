export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default-jwt-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRATION || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-jwt-secret-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  business: {
    reservationTtlMinutes: parseInt(process.env.RESERVATION_TTL_MINUTES, 10) || 15,
    defaultCommissionPercent: parseFloat(process.env.DEFAULT_COMMISSION_PERCENT) || 10.0,
  },
});
