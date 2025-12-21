export const PLAYER_SKINS = ['cat-hero', 'xmascat'] as const;
export type PlayerSkin = (typeof PLAYER_SKINS)[number];
export const DEFAULT_PLAYER_SKIN: PlayerSkin = 'cat-hero';
