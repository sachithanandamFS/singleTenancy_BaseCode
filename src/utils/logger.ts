import winston from "winston"

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "blue",
}

winston.addColors(colors)

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    let logMessage = `${info.timestamp} ${info.level}: ${info.message}`;
    
    // Add error details if present
    if (info.error || info.stack) {
      logMessage += `\n  Error: ${info.error || 'Unknown error'}`;
      if (info.stack) {
        logMessage += `\n  Stack: ${info.stack}`;
      }
    }
    
    // Add any other metadata
    const metaKeys = Object.keys(info).filter(
      (key) => !['timestamp', 'level', 'message', 'error', 'stack', 'splat', 'Symbol(for winston.extraction)'].includes(key)
    );
    
    if (metaKeys.length > 0) {
      logMessage += '\n  Metadata:';
      metaKeys.forEach((key) => {
        const value = info[key];
        logMessage += `\n    ${key}: ${JSON.stringify(value)}`;
      });
    }
    
    return logMessage;
  })
)

const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: "logs/error.log",
    level: "error",
  }),
  new winston.transports.File({ filename: "logs/all.log" }),
]

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  levels,
  format,
  transports,
})
