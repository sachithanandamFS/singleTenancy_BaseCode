import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: false });

  const env = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || 5000;

  // Trust proxy so req.ip reflects the real client IP from X-Forwarded-For
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // Dynamic CORS by environment
  const allowedOrigins: Record<string, string[]> = {
    development: process.env.DEV_ORIGIN?.split(',').map(o => o.trim()) ?? [],
    production: process.env.PROD_ORIGIN?.split(',').map(o => o.trim()) ?? [],
  };

  app.enableCors({
    origin: (origin, callback) => {
      const allowed = allowedOrigins[env] ?? [];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS rejected origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Language', 'Idempotency-Key'],
    credentials: true,
    maxAge: 86400,
  });

  // Force HTTPS in production
  if (env === 'production') {
    app.use((req: any, res: any, next: any) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        res.redirect(`https://${req.header('host')}${req.url}`);
      } else {
        next();
      }
    });
  }

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(port);
  logger.info(`SingleTenancy server running on port ${port} [${env}]`);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap();
