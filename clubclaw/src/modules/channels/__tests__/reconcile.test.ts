import { describe, it, expect } from 'vitest';
import { diffChannels } from '../reconcile.js';

describe('diffChannels', () => {
  it('detects channels that need to be created', () => {
    const configured = [
      { name: 'frontend', access: ['Frontend'] },
      { name: 'backend', access: ['Backend'] },
    ];
    const existing = ['frontend'];

    const diff = diffChannels(configured, existing);
    expect(diff.toCreate).toEqual([{ name: 'backend', access: ['Backend'] }]);
  });

  it('returns empty when all channels exist', () => {
    const configured = [{ name: 'general', access: [] }];
    const existing = ['general'];

    const diff = diffChannels(configured, existing);
    expect(diff.toCreate).toEqual([]);
  });
});
