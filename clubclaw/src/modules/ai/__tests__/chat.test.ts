import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../chat.js';

describe('buildSystemPrompt', () => {
  it('includes org name and knowledge content', () => {
    const prompt = buildSystemPrompt('CS Club', 'A computer science club', '# FAQ\nMeetings on Thursdays.');
    expect(prompt).toContain('CS Club');
    expect(prompt).toContain('A computer science club');
    expect(prompt).toContain('Meetings on Thursdays');
  });

  it('includes guardrails and conversational tone', () => {
    const prompt = buildSystemPrompt('CS Club', undefined, '# Info');
    expect(prompt).toContain('Guardrails');
    expect(prompt).toContain('casual conversation');
  });

  it('handles missing description', () => {
    const prompt = buildSystemPrompt('CS Club', undefined, '# Info');
    expect(prompt).toContain('CS Club');
    expect(prompt).not.toContain('undefined');
  });
});
