export const config = {
  port: Number(process.env.PORT ?? 58310),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
};
