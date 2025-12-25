import Phaser from 'phaser';
import { getTextScale, toFont } from '../config/gameConfig';
import { SceneKeys } from '../constants/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  private progressBox?: Phaser.GameObjects.Rectangle;
  private progressBar?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private progressValue = 0;
  private progressTimer?: Phaser.Time.TimerEvent;
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;

  constructor() {
    super(SceneKeys.PRELOAD);
  }

  preload(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.progressBox = this.add.rectangle(width / 2, height / 2, 320, 32, 0x1f2433, 0.8);
    this.progressBar = this.add.rectangle(width / 2 - 150, height / 2, 0, 16, 0xffe066, 1);
    const scale = getTextScale(width, height);
    this.progressText = this.add.text(width / 2, height / 2 + 40, 'Загрузка... 0%', {
      font: toFont(16, scale),
      color: '#a5c6ff',
    });
    this.progressText.setOrigin(0.5);
    this.updateTypography(scale);

    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.updateTypography(getTextScale(gameSize.width, gameSize.height));
    };
    this.scale.on('resize', this.resizeHandler);

    this.load.on('progress', (value: number) => {
      const percent = Math.round(value * 90);
      this.setProgress(percent);
    });

    this.load.on('complete', () => {
      this.setProgress(90);
      this.progressTimer?.remove();
      this.progressTimer = this.time.addEvent({
        delay: 30,
        loop: true,
        callback: () => {
          if (this.progressValue < 99) {
            this.setProgress(this.progressValue + 1);
          }
        },
      });
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
    void this.loadMainMenuScene();
  }

  private async loadMainMenuScene(): Promise<void> {
    try {
      const { MainMenuScene } = await import('./MainMenuScene');
      this.scene.add(SceneKeys.MAIN_MENU, MainMenuScene, false);
    } finally {
      this.progressTimer?.remove();
      this.setProgress(100);
      this.progressBox?.destroy();
      this.progressBar?.destroy();
      this.progressText?.destroy();
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
      }
    }

    this.scene.start(SceneKeys.MAIN_MENU);
  }

  private setProgress(value: number): void {
    this.progressValue = value;
    if (this.progressBar) {
      this.progressBar.width = 300 * (value / 100);
    }
    if (this.progressText) {
      this.progressText.setText(`Загрузка... ${value}%`);
    }
  }

  private updateTypography(scale: number): void {
    if (this.progressText) {
      this.progressText.setStyle({ font: toFont(16, scale) });
    }
  }
}
