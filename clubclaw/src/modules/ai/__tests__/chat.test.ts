import { describe, it, expect } from 'vitest';
import { buildSystemPrompt } from '../chat.js';

describe('buildSystemPrompt', () => {
  const fakeBrain = '# Brain\n\n## Personality\n- Chill and approachable\n\n## Guardrails\n- Stay respectful';
  const fakeKnowledge = '# FAQ\nMeetings on Thursdays.';

  it('includes brain and knowledge content', () => {
    const prompt = buildSystemPrompt(fakeBrain, fakeKnowledge);
    expect(prompt).toContain('Chill and approachable');
    expect(prompt).toContain('Meetings on Thursdays');
  });

  it('includes club knowledge section header', () => {
    const prompt = buildSystemPrompt(fakeBrain, fakeKnowledge);
    expect(prompt).toContain('## Club Knowledge');
  });

  it('puts brain content before knowledge', () => {
    const prompt = buildSystemPrompt(fakeBrain, fakeKnowledge);
    const brainIndex = prompt.indexOf('Personality');
    const knowledgeIndex = prompt.indexOf('Meetings on Thursdays');
    expect(brainIndex).toBeLessThan(knowledgeIndex);
  });
});
