import Phaser from 'phaser';
import { SceneKeys } from '../constants/SceneKeys';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.BOOT);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0d0f1d');
    this.scene.start(SceneKeys.PRELOAD);
  }
}
