import fs from 'fs';
import path from 'path';
import { config } from '../config';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

class Logger {
  private logLevel: LogLevel;
  private logFile: string;

  constructor() {
    this.logLevel = this.getLogLevel(config.logging.level);
    this.logFile = config.logging.file;
    
    // Ensure log directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private getLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  private writeLog(level: LogLevel, message: string, meta?: any): void {
    if (level <= this.logLevel) {
      const levelName = LogLevel[level];
      const formattedMessage = this.formatMessage(levelName, message, meta);
      
      // Console output
      console.log(formattedMessage);
      
      // File output
      try {
        fs.appendFileSync(this.logFile, formattedMessage + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  error(message: string, meta?: any): void {
    this.writeLog(LogLevel.ERROR, message, meta);
  }

  warn(message: string, meta?: any): void {
    this.writeLog(LogLevel.WARN, message, meta);
  }

  info(message: string, meta?: any): void {
    this.writeLog(LogLevel.INFO, message, meta);
  }

  debug(message: string, meta?: any): void {
    this.writeLog(LogLevel.DEBUG, message, meta);
  }
}

export const logger = new Logger();