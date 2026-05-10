import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { EmployeeModule } from './modules/employee/employee.module';
import { RoleModule } from './modules/role/role.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestContextInterceptor } from './common/interceptors/request-context.interceptor';
import { LanguageInterceptor } from './common/interceptors/language.interceptor';
import { SecurityValidationInterceptor } from './common/interceptors/security-validation.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    }]),
    DatabaseModule,
    RedisModule,
    EmployeeModule,
    RoleModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LanguageInterceptor },
    { provide: APP_INTERCEPTOR, useClass: SecurityValidationInterceptor },
  ],
})
export class AppModule {}
