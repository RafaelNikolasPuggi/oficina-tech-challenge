import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfig } from './configuration';

export function buildTypeOrmOptions(
  configService: ConfigService<AppConfig, true>,
): TypeOrmModuleOptions {
  const db = configService.get('database', { infer: true });

  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.TYPEORM_LOGGING === 'true',
  };
}
