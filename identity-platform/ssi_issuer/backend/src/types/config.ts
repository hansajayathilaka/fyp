export interface Config {
  server: {
    port: number;
    host: string;
    corsOrigins: string[];
  };
  database: {
    uri: string;
    options: {
      maxPoolSize: number;
      serverSelectionTimeoutMS: number;
      socketTimeoutMS: number;
    };
  };
  keria: {
    url: string;
    bootUrl: string;
    timeout: number;
  };
  auth: {
    jwtSecret: string;
    sessionTimeout: number;
  };
  logging: {
    level: string;
    file: string;
  };
  traefik: {
    domain: string;
    email: string;
    network: string;
  };
}