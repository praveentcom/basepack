/**
 * Unit tests for messaging index
 */

import * as messagingModule from '../../../src/messaging/index';

describe('Messaging Index', () => {
  it('should export all modules', () => {
    // Check that all expected exports are available
    expect(messagingModule.MessagingService).toBeDefined();
    expect(messagingModule.MessagingProvider).toBeDefined();
    expect(messagingModule.MessagingError).toBeDefined();
    expect(messagingModule.MessagingValidationError).toBeDefined();
    expect(messagingModule.validateSMSMessage).toBeDefined();
    expect(messagingModule.validateWhatsAppMessage).toBeDefined();
    expect(messagingModule.validateRCSMessage).toBeDefined();
  });

  it('should export types', () => {
    // Check that types are exported (they won't be available at runtime but should be in the module)
    const moduleExports = Object.keys(messagingModule);
    
    // These are the main exports that should be available
    const expectedExports = [
      'MessagingService',
      'MessagingProvider',
      'MessagingError',
      'MessagingValidationError',
      'validateSMSMessage',
      'validateWhatsAppMessage',
      'validateRCSMessage',
    ];
    
    expectedExports.forEach(exportName => {
      expect(moduleExports).toContain(exportName);
    });
  });
});
