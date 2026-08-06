import { describe, it, expect } from 'vitest';
import { getStatus } from './index';

describe('Simulator', () => {
  it('should return ready status', () => {
    expect(getStatus()).toBe('Tracking simulator workspace is ready.');
  });
});
