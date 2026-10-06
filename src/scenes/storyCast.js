export const SPEAKER_PORTRAIT = {
  kabir: 'kabir_neutral',
  nila: 'nila_neutral',
  sharmin: 'sharmin_neutral',
  tanvir: 'tanvir_neutral',
  alam: 'alam_neutral',
  rafiq: 'rafiq_neutral',
  satellite: 'satellite',
};

export const SPEAKER_NAME = {
  kabir: 'KABIR-BHAI',
  nila: 'NILA',
  sharmin: 'MS. SHARMIN',
  tanvir: 'DR. TANVIR',
  alam: 'SEC. ALAM',
  satellite: 'THE SATELLITE',
  rafiq: 'RAFIQ',
  narrator: '',
};

export const SPEAKER_ROLE = {
  kabir: 'chief engineer',
  nila: 'flight director',
  sharmin: 'finance secretary',
  tanvir: 'meteorologist',
  alam: 'government liaison',
  rafiq: 'chai-wallah',
};

export const SPEAKER_INTRO = {
  kabir: "Come in, {name}. I am Kabir — the chief engineer in this centre. Meet the team.",
  tanvir: 'Tanvir. Meteorologist. Clouds, storms and the numbers behind them — that is my job here.',
  sharmin: 'Sharmin. Finance secretary. Every taka in this centre walks past my desk.',
  alam: 'Alam. Government liaison. I carry your promises to the ministry, so please keep them.',
  rafiq: 'Rafiq. Chai-wallah. Best tea in the centre — and I hear everything that happens here.',
};

export const TEAM_INTRO = {
  kabir: 'Team, meet our new director — {title} {name}.',
  tanvir: 'Hello. I am Tanvir, in charge of the weather.',
  sharmin: 'Hi, nice to meet you. I am Sharmin, and I look after the money.',
  alam: 'Good to meet you. I am Alam, your bridge to the government.',
};

export const SPEAKER_SHORT_ROLE = {
  kabir: 'ENGINEER',
  tanvir: 'WEATHER',
  sharmin: 'FINANCE',
  alam: 'GOVERNMENT',
  rafiq: 'TEA WALLAH',
};

export const TEAM_ORDER = ['kabir', 'tanvir', 'sharmin', 'alam'];

export function introFor(speaker, flags = {}) {
  const text = SPEAKER_INTRO[speaker];
  if (!text || flags[`met_${speaker}`]) return null;
  return { id: `intro_${speaker}`, speaker, portrait: 'neutral', text, intro: true };
}
