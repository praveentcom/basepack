/**
 * Unit tests for logger index
 */

import * as loggerModule from '../../../src/logger/index';

describe('Logger Index', () => {
  it('should export all modules', () => {
    // Check that all expected exports are available
    expect(loggerModule.noopLogger).toBeDefined();
    expect(loggerModule.wrapPino).toBeDefined();
    expect(loggerModule.wrapWinston).toBeDefined();
    expect(loggerModule.wrapBunyan).toBeDefined();
    expect(loggerModule.consoleLogger).toBeDefined();
  });

  it('should export types', () => {
    // Check that types are exported (they won't be available at runtime but should be in the module)
    const moduleExports = Object.keys(loggerModule);
    
    // These are the main exports that should be available
    const expectedExports = [
      'noopLogger',
      'wrapPino',
      'wrapWinston',
      'wrapBunyan',
      'consoleLogger',
    ];
    
    expectedExports.forEach(exportName => {
      expect(moduleExports).toContain(exportName);
    });
  });
});
