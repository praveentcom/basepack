import { withRetry } from '../../../src/email/retry';
import { EmailError } from '../../../src/email/errors';

describe('Retry Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    
    const result = await withRetry(fn);
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new EmailError('Timeout', 'ses', 408, undefined, true))
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn, { retries: 2, minTimeout: 10, maxTimeout: 50 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new EmailError('Bad Request', 'ses', 400, undefined, false));
    
    await expect(withRetry(fn, { retries: 3 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on network errors', async () => {
    const networkError = new Error('Connection timeout');
    (networkError as any).code = 'ETIMEDOUT';
    const fn = jest.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn, { retries: 2, minTimeout: 10, maxTimeout: 50 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on rate limit errors', async () => {
    const rateLimitError = Object.assign(new Error('Too many requests'), { statusCode: 429 });
    const fn = jest.fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn, { retries: 2, minTimeout: 10, maxTimeout: 50 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after all retries exhausted', async () => {
    const error = new EmailError('Timeout', 'ses', 408, undefined, true);
    const fn = jest.fn().mockRejectedValue(error);
    
    await expect(withRetry(fn, { retries: 2, minTimeout: 10, maxTimeout: 50 })).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should call onRetry callback', async () => {
    const onRetry = jest.fn();
    const error = new EmailError('Timeout', 'ses', 408, undefined, true);
    const fn = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');
    
    await withRetry(fn, { 
      retries: 2, 
      minTimeout: 10, 
      maxTimeout: 50,
      onRetry 
    });
    
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('should respect retry configuration', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new EmailError('Error', 'ses', 500, undefined, true))
      .mockRejectedValueOnce(new EmailError('Error', 'ses', 500, undefined, true))
      .mockRejectedValueOnce(new EmailError('Error', 'ses', 500, undefined, true))
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn, { 
      retries: 5, 
      minTimeout: 10, 
      maxTimeout: 100 
    });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('should use default options', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce(new EmailError('Error', 'ses', 500, undefined, true))
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn);
    
    expect(result).toBe('success');
  });

  it('should handle errors with statusCode', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce({ statusCode: 503 })
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn, { retries: 2, minTimeout: 10, maxTimeout: 50 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should handle errors with status property', async () => {
    const fn = jest.fn()
      .mockRejectedValueOnce({ status: 502 })
      .mockResolvedValueOnce('success');
    
    const result = await withRetry(fn, { retries: 2, minTimeout: 10, maxTimeout: 50 });
    
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable status codes', async () => {
    const error = new Error('Bad Request');
    (error as any).statusCode = 400;
    const fn = jest.fn()
      .mockRejectedValueOnce(error);
    
    await expect(withRetry(fn, { retries: 3 })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

