import Phaser from 'phaser';
import { getTextScale, toFont } from '../config/gameConfig';
import { forestSlices } from '../assets/forestSlices';
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
    const snowballUrl = new URL('../../assets/snowball.png', import.meta.url).toString();
    this.load.image('snowball', snowballUrl);
    const menuBackgroundUrl = new URL('../../assets/menu-background.png', import.meta.url).toString();
    this.load.image('menu-background', menuBackgroundUrl);
    const levelFinish1Url = new URL('../../assets/levels/finish-1.png', import.meta.url).toString();
    this.load.image('level-finish-1', levelFinish1Url);
    const levelFinish2Url = new URL('../../assets/levels/finish-2.png', import.meta.url).toString();
    this.load.image('level-finish-2', levelFinish2Url);
    const levelFinish3Url = new URL('../../assets/levels/finish-3.png', import.meta.url).toString();
    this.load.image('level-finish-3', levelFinish3Url);
    const levelFinish4Url = new URL('../../assets/levels/finish-4.png', import.meta.url).toString();
    this.load.image('level-finish-4', levelFinish4Url);
    const levelFinish5Url = new URL('../../assets/levels/finish-5.png', import.meta.url).toString();
    this.load.image('level-finish-5', levelFinish5Url);
    const levelFinish6Url = new URL('../../assets/levels/finish-6.png', import.meta.url).toString();
    this.load.image('level-finish-6', levelFinish6Url);

    const giftBase = '../../assets/gifts/';
    this.load.image('gift-1', new URL(`${giftBase}gift.png`, import.meta.url).toString());
    this.load.image('gift-2', new URL(`${giftBase}gift2.png`, import.meta.url).toString());
    this.load.image('gift-3', new URL(`${giftBase}gift3.png`, import.meta.url).toString());
    this.load.image('gift-4', new URL(`${giftBase}gift4.png`, import.meta.url).toString());
    this.load.image('gift-5', new URL(`${giftBase}gift5.png`, import.meta.url).toString());
    this.load.image('gift-6', new URL(`${giftBase}gift6.png`, import.meta.url).toString());
    this.load.image('gift-7', new URL(`${giftBase}gift7.png`, import.meta.url).toString());

    this.load.audio('sfx-pick', new URL('../../assets/audio/pick.mp3', import.meta.url).toString());
    this.load.audio('sfx-button-click', new URL('../../assets/audio/button-click.mp3', import.meta.url).toString());
    this.load.audio('sfx-game-start', new URL('../../assets/audio/game-start.mp3', import.meta.url).toString());
    this.load.audio('sfx-success', new URL('../../assets/audio/success.mp3', import.meta.url).toString());
    this.load.audio('sfx-no-luck', new URL('../../assets/audio/no-luck.mp3', import.meta.url).toString());
    this.load.audio('sfx-snowball-hit', new URL('../../assets/audio/snowball-hit.mp3', import.meta.url).toString());
    this.load.audio('sfx-sad-meow-1', new URL('../../assets/audio/sad-meow-1.mp3', import.meta.url).toString());
    this.load.audio('sfx-sad-meow-2', new URL('../../assets/audio/sad-meow-2.mp3', import.meta.url).toString());
    this.load.audio('sfx-pick-star', new URL('../../assets/audio/pick-star.mp3', import.meta.url).toString());
    this.load.audio('sfx-star-shoot', new URL('../../assets/audio/star-shoot.mp3', import.meta.url).toString());
    this.load.audio('sfx-ice-break', new URL('../../assets/audio/ice-break.mp3', import.meta.url).toString());
    const bgmBase = '../../assets/audio/background/';
    this.load.audio('bgm-menu', new URL(`${bgmBase}menu.mp3`, import.meta.url).toString());
    this.load.audio('bgm-1', new URL(`${bgmBase}1.mp3`, import.meta.url).toString());
    this.load.audio('bgm-2', new URL(`${bgmBase}2.mp3`, import.meta.url).toString());
    this.load.audio('bgm-3', new URL(`${bgmBase}3.mp3`, import.meta.url).toString());
    this.load.audio('bgm-4', new URL(`${bgmBase}4.mp3`, import.meta.url).toString());
    this.load.audio('bgm-5', new URL(`${bgmBase}5.mp3`, import.meta.url).toString());
    this.load.audio('bgm-6', new URL(`${bgmBase}6.mp3`, import.meta.url).toString());
    this.load.audio('bgm-7', new URL(`${bgmBase}7.mp3`, import.meta.url).toString());

    const forestBase = '../../assets/forest/';
    this.load.image('forest-bg-1', new URL(`${forestBase}Background 1.png`, import.meta.url).toString());
    this.load.image('forest-bg-1b', new URL(`${forestBase}Background 1.2.png`, import.meta.url).toString());
    this.load.image('forest-bg-2', new URL(`${forestBase}Background 2.png`, import.meta.url).toString());
    this.load.image('forest-bg-3', new URL(`${forestBase}Background 3.png`, import.meta.url).toString());
    this.load.image('forest-bg-4', new URL(`${forestBase}Background 4.png`, import.meta.url).toString());
    this.load.image('forest-bg-5', new URL(`${forestBase}Background 5.png`, import.meta.url).toString());
    const forestSliceBase = '../../assets/forest/slices/';
    forestSlices.forEach((slice) => {
      this.load.image(slice.key, new URL(`${forestSliceBase}${slice.filename}`, import.meta.url).toString());
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
