import dotenv from "dotenv"
import { Dialect, Options, Sequelize } from "sequelize"

dotenv.config()

const dbPort = process.env.POSTGRES_PORT
const dbHost = process.env.POSTGRES_HOST
const dbUser = process.env.POSTGRES_USER
const dbPassword = process.env.POSTGRES_PASSWORD
const dbName = process.env.POSTGRES_DB
const dbDialect = "postgres" as Dialect

export type IEnvironment = "development" | "production" | "test"

interface PostgresConfig {
  options: Options
  client: any | null
}

interface IEnvironmentConfig {
  name: string
  version: string
  serviceTimeout: number
  postgres: PostgresConfig
}

type Config = {
  [key in IEnvironment]: IEnvironmentConfig
}

const config: Config = {
  development: {
    name: "backend",
    version: "1.0.0",
    serviceTimeout: 30,
    postgres: {
      options: {
        host: dbHost,
        port: parseInt(dbPort as string),
        database: dbName,
        username: dbUser,
        password: dbPassword,
        dialect: dbDialect,
        dialectOptions: {
          // Remove SSL requirement for development
        },
        logging: false,
      },
      client: null,
    },
  },
  production: {
    name: "backend",
    version: "1.0.0",
    serviceTimeout: 30,
    postgres: {
      options: {
        dialect: dbDialect,
        host: dbHost,
        port: parseInt(dbPort as string),
        database: dbName,
        username: dbUser,
        password: dbPassword,
        dialectOptions: {
          // Disable SSL for hosting providers that don't support it
          ssl: true,
        },
        logging: false,
      },
      client: null,
    },
  },
  test: {
    name: "backend",
    version: "1.0.0",
    serviceTimeout: 30,
    postgres: {
      options: {
        dialect: dbDialect,
        host: dbHost,
        port: parseInt(dbPort as string),
        database: dbName,
        username: dbUser,
        password: dbPassword,
        dialectOptions: {
          // Remove SSL requirement for test environment
        },
        logging: false,
      },
      client: null,
    },
  },
}

export const sequelize = new Sequelize({
  dialect: "postgres",
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
})

export default config
