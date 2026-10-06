export const AVATARS = [
  { id: 'boy', label: 'BOY', sprite: 'avatar_boy', subject: 'he', object: 'him', possessive: 'his' },
  { id: 'girl', label: 'GIRL', sprite: 'avatar_girl', subject: 'she', object: 'her', possessive: 'her' },
];

export const DEFAULT_NAME = 'DIRECTOR';

export const MAX_NAME = 12;

export function avatarFor(index) {
  const i = Number.isFinite(index) ? Math.trunc(index) : 0;
  return AVATARS[i] ?? AVATARS[0];
}

export function cleanName(raw) {
  const name = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);
  return name || DEFAULT_NAME;
}

export function playerTokens(player) {
  const a = avatarFor(player?.avatar);
  return {
    name: cleanName(player?.name),
    he: a.subject,
    him: a.object,
    his: a.possessive,
    title: a.subject === 'she' ? 'Ms' : 'Mr',
  };
}

export function fillTokens(text, player) {
  const tokens = playerTokens(player);
  return String(text ?? '').replace(/\{(name|he|him|his|title)\}/gi, (match, key) => {
    const value = tokens[key.toLowerCase()] ?? '';
    const capital = key[0] === key[0].toUpperCase() && key[0] !== key[0].toLowerCase();
    return capital ? value.charAt(0).toUpperCase() + value.slice(1) : value;
  });
}
