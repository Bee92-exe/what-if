import { describe, it, expect } from 'vitest';
import { AVATARS, DEFAULT_NAME, MAX_NAME, avatarFor, cleanName, playerTokens, fillTokens } from '../src/utils/player.js';
import { SPEAKER_INTRO, SPEAKER_NAME, SPEAKER_ROLE, TEAM_INTRO, TEAM_ORDER, introFor } from '../src/scenes/storyCast.js';

describe('player tokens', () => {
  it('has a boy and a girl avatar with matching pronouns', () => {
    expect(AVATARS.map((a) => a.id)).toEqual(['boy', 'girl']);
    expect(playerTokens({ name: 'ARIF', avatar: 0 })).toMatchObject({ he: 'he', him: 'him', his: 'his' });
    expect(playerTokens({ name: 'NILA', avatar: 1 })).toMatchObject({ he: 'she', him: 'her', his: 'her' });
  });

  it('falls back to the first avatar for a missing or unknown choice', () => {
    expect(avatarFor(undefined).id).toBe('boy');
    expect(avatarFor(9).id).toBe('boy');
    expect(avatarFor(1).id).toBe('girl');
  });

  it('trims, collapses and caps a typed name, and never returns an empty one', () => {
    expect(cleanName('  nila  ')).toBe('nila');
    expect(cleanName('a   b')).toBe('a b');
    expect(cleanName('')).toBe(DEFAULT_NAME);
    expect(cleanName(null)).toBe(DEFAULT_NAME);
    expect(cleanName('X'.repeat(40)).length).toBe(MAX_NAME);
  });

  it('fills {name} and the pronouns, with capitalised forms for sentence starts', () => {
    const player = { name: 'NILA', avatar: 1 };
    expect(fillTokens('{name} walked in. {He} saw a folder. It was {his}.', player)).toBe(
      'NILA walked in. She saw a folder. It was her.'
    );
  });

  it('picks the honorific that matches the chosen director', () => {
    expect(fillTokens('meet {title} {name}', { name: 'ARIF', avatar: 0 })).toBe('meet Mr ARIF');
    expect(fillTokens('meet {title} {name}', { name: 'NILA', avatar: 1 })).toBe('meet Ms NILA');
  });

  it('leaves other braces alone and never renders undefined', () => {
    expect(fillTokens('{stars} and {name}', { name: '', avatar: 0 })).toBe(`${'{stars}'} and ${DEFAULT_NAME}`);
    expect(fillTokens(undefined, {})).toBe('');
  });
});

describe('character introductions', () => {
  it('every member of the briefing team has an introduction', () => {
    for (const speaker of TEAM_ORDER) {
      expect(SPEAKER_INTRO[speaker], `${speaker} has no intro line`).toBeTruthy();
    }
  });

  it('hands out one introduction per character, then stops', () => {
    const intro = introFor('kabir', {});
    expect(intro).toMatchObject({ speaker: 'kabir', intro: true });
    expect(intro.text).toContain('{name}');
    expect(introFor('kabir', { met_kabir: true })).toBeNull();
  });

  it('has nothing to say for the narrator or the satellite', () => {
    expect(introFor('narrator', {})).toBeNull();
    expect(introFor('satellite', {})).toBeNull();
  });

  it('gives the briefing room a different line for every face', () => {
    const lines = TEAM_ORDER.map((s) => TEAM_INTRO[s]);
    expect(lines.every(Boolean)).toBe(true);
    expect(new Set(lines).size).toBe(lines.length);
    // Kabir already introduced himself in the archive, so here he introduces
    // the player instead — never himself twice.
    expect(TEAM_INTRO.kabir).toContain('{title}');
    expect(TEAM_INTRO.kabir).toContain('{name}');
    for (const speaker of TEAM_ORDER) {
      if (speaker === 'kabir') continue;
      // Every self-introduction names the speaker and the job they hold.
      expect(TEAM_INTRO[speaker].toLowerCase(), `${speaker} does not say who they are`).toContain(
        SPEAKER_NAME[speaker].split(' ').pop().toLowerCase()
      );
      expect(SPEAKER_ROLE[speaker], `${speaker} has no role`).toBeTruthy();
    }
  });
});
