import Phaser from 'phaser';
import { SceneKeys } from '../constants/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.PRELOAD);
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBox = this.add.rectangle(width / 2, height / 2, 320, 32, 0x1f2433, 0.8);
    const progressBar = this.add.rectangle(width / 2 - 150, height / 2, 0, 16, 0xffe066, 1);

    this.load.on('progress', (value: number) => {
      progressBar.width = 300 * value;
    });

    this.load.on('complete', () => {
      progressBox.destroy();
      progressBar.destroy();
    });

    const catHeroUrl = new URL('../../assets/cat-hero.png', import.meta.url).toString();
    this.load.spritesheet('cat-hero', catHeroUrl, {
      frameWidth: 64,
      frameHeight: 48,
    });
    const xmasCatUrl = new URL('../../assets/xmascat.png', import.meta.url).toString();
    this.load.spritesheet('xmascat', xmasCatUrl, {
      frameWidth: 258,
      frameHeight: 196,
    });
  }

  create(): void {
    this.scene.start(SceneKeys.MAIN_MENU);
  }
}
