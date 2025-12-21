import { DEFAULT_PLAYER_SKIN, PlayerSkin } from '../config/playerSkins';

let activeSkin: PlayerSkin = DEFAULT_PLAYER_SKIN;

export function getActiveSkin(): PlayerSkin {
  return activeSkin;
}

export function setActiveSkin(skin: PlayerSkin): void {
  activeSkin = skin;
}
