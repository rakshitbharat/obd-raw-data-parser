/**
 * A simplified logging utility that replaces react-native-beautiful-logs
 * with basic console logging functionality.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Main logging function that provides a simple console logging with timestamp and log level.
 *
 * @param levelOrMessage - Log level or message
 * @param args - Additional arguments to log
 */
export const log = (
  levelOrMessage: LogLevel | string,
  ...args: unknown[]
): void => {
  const timestamp = new Date().toISOString();
  let level: LogLevel = 'info';
  let messages = args;

  // Determine if first argument is a log level
  if (
    typeof levelOrMessage === 'string' &&
    ['debug', 'info', 'warn', 'error'].includes(levelOrMessage)
  ) {
    level = levelOrMessage as LogLevel;
  } else {
    messages = [levelOrMessage, ...args];
  }

  // Create the log prefix with timestamp and level
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  // Use appropriate console method based on level
  switch (level) {
    case 'debug':
      console.debug(prefix, ...messages);
      break;
    case 'warn':
      console.warn(prefix, ...messages);
      break;
    case 'error':
      console.error(prefix, ...messages);
      break;
    default:
      console.log(prefix, ...messages);
  }
};
