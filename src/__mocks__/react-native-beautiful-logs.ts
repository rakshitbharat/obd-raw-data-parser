export const log = jest.fn();
export const loggerInterface = {
  clearAll: jest.fn(),
  deleteFile: jest.fn(),
  deleteOldFiles: jest.fn(),
  exists: jest.fn(),
  getContent: jest.fn(),
  getCurrentSessionPath: jest.fn(),
  getFiles: jest.fn(),
  getStats: jest.fn(),
};
export const initSessionLog = jest.fn().mockResolvedValue(true);
export const configureLogger = jest.fn();
