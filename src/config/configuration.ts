export interface AppConfig {
  port: number;
  jwt: {
    secret: string;
    expiresIn: string;
  };
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
}

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'oficina',
    password: process.env.DB_PASSWORD ?? 'oficina',
    database: process.env.DB_DATABASE ?? 'oficina',
  },
});
