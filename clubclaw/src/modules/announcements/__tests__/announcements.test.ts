import { describe, it, expect } from 'vitest';
import cron from 'node-cron';

describe('Announcements cron expressions', () => {
  it('validates a correct cron expression', () => {
    expect(cron.validate('0 10 * * WED')).toBe(true);
  });

  it('rejects an invalid cron expression', () => {
    expect(cron.validate('not a cron')).toBe(false);
  });
});
