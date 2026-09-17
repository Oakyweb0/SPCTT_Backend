import { config } from '../config/env.js';

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = levels[config.LOG_LEVEL] ?? levels.info;

function formatMessage(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.length > 0 ? ' ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : a)).join(' ') : '';
  return `[${timestamp}] [${level.toUpperCase()}]: ${message}${formattedArgs}`;
}

export const logger = {
  debug: (message, ...args) => {
    if (currentLevel <= levels.debug) {
      console.log(formatMessage('debug', message, ...args));
    }
  },
  info: (message, ...args) => {
    if (currentLevel <= levels.info) {
      console.log(formatMessage('info', message, ...args));
    }
  },
  warn: (message, ...args) => {
    if (currentLevel <= levels.warn) {
      console.warn(formatMessage('warn', message, ...args));
    }
  },
  error: (message, ...args) => {
    if (currentLevel <= levels.error) {
      console.error(formatMessage('error', message, ...args));
    }
  }
};

export default logger;
