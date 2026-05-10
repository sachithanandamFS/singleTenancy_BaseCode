import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import User from '../models/user.model';
import Role from '../models/role.model';
import UserRole from '../models/user-role.model';
import RoleResponsibility from '../models/role-responsibility.model';
import AwsFile from '../models/aws-file.model';
import { initializeEventListeners } from '../domain/events/EventListenerRegistry';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const isProd = config.get('NODE_ENV') === 'production';
        return {
          dialect: 'postgres',
          host: config.get('POSTGRES_HOST'),
          port: Number(config.get('POSTGRES_PORT') ?? 5432),
          username: config.get('POSTGRES_USER'),
          password: config.get('POSTGRES_PASSWORD'),
          database: config.get('POSTGRES_DB'),
          models: [User, Role, UserRole, RoleResponsibility, AwsFile],
          autoLoadModels: false,
          synchronize: false,
          logging: false,
          dialectOptions: isProd ? { ssl: true } : {},
          hooks: {
            afterConnect: () => {
              initializeEventListeners();
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
