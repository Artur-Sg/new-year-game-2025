import Phaser from 'phaser';
import { getTextScale, toFont } from '../config/gameConfig';
import { forestSlices } from '../assets/forestSlices';
import { SceneKeys } from '../constants/SceneKeys';

export class PreloadScene extends Phaser.Scene {
  private progressBox?: Phaser.GameObjects.Rectangle;
  private progressBar?: Phaser.GameObjects.Rectangle;
  private progressText?: Phaser.GameObjects.Text;
  private skipButton?: Phaser.GameObjects.Container;
  private skipButtonLabel?: Phaser.GameObjects.Text;
  private skipButtonBg?: Phaser.GameObjects.Graphics;
  private introVideo?: Phaser.GameObjects.Video;
  private introSourceWidth = 0;
  private introSourceHeight = 0;
  private introStartButton?: Phaser.GameObjects.Container;
  private introStartLabel?: Phaser.GameObjects.Text;
  private introStartBg?: Phaser.GameObjects.Graphics;
  private spaceKey?: Phaser.Input.Keyboard.Key;
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
      const scale = getTextScale(gameSize.width, gameSize.height);
      this.updateTypography(scale);
      this.layoutSkipButton(gameSize.width, gameSize.height, scale);
      this.layoutStartButton(gameSize.width, gameSize.height, scale);
      if (this.introVideo) {
        this.layoutIntro(this.introVideo, gameSize.width, gameSize.height);
      }
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
    const introUrl = new URL('../../assets/video/intro.mp4', import.meta.url).toString();
    this.load.video('intro', introUrl);
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

    this.load.image('gift-1', new URL('../../assets/gifts/gift.png', import.meta.url).toString());
    this.load.image('gift-2', new URL('../../assets/gifts/gift2.png', import.meta.url).toString());
    this.load.image('gift-3', new URL('../../assets/gifts/gift3.png', import.meta.url).toString());
    this.load.image('gift-4', new URL('../../assets/gifts/gift4.png', import.meta.url).toString());
    this.load.image('gift-5', new URL('../../assets/gifts/gift5.png', import.meta.url).toString());
    this.load.image('gift-6', new URL('../../assets/gifts/gift6.png', import.meta.url).toString());
    this.load.image('gift-7', new URL('../../assets/gifts/gift7.png', import.meta.url).toString());

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
    this.load.audio('bgm-menu', new URL('../../assets/audio/background/menu.mp3', import.meta.url).toString());
    this.load.audio('bgm-1', new URL('../../assets/audio/background/1.mp3', import.meta.url).toString());
    this.load.audio('bgm-2', new URL('../../assets/audio/background/2.mp3', import.meta.url).toString());
    this.load.audio('bgm-3', new URL('../../assets/audio/background/3.mp3', import.meta.url).toString());
    this.load.audio('bgm-4', new URL('../../assets/audio/background/4.mp3', import.meta.url).toString());
    this.load.audio('bgm-5', new URL('../../assets/audio/background/5.mp3', import.meta.url).toString());
    this.load.audio('bgm-6', new URL('../../assets/audio/background/6.mp3', import.meta.url).toString());
    this.load.audio('bgm-7', new URL('../../assets/audio/background/7.mp3', import.meta.url).toString());

    this.load.image('forest-bg-1', new URL('../../assets/forest/Background 1.png', import.meta.url).toString());
    this.load.image('forest-bg-1b', new URL('../../assets/forest/Background 1.2.png', import.meta.url).toString());
    this.load.image('forest-bg-2', new URL('../../assets/forest/Background 2.png', import.meta.url).toString());
    this.load.image('forest-bg-3', new URL('../../assets/forest/Background 3.png', import.meta.url).toString());
    this.load.image('forest-bg-4', new URL('../../assets/forest/Background 4.png', import.meta.url).toString());
    this.load.image('forest-bg-5', new URL('../../assets/forest/Background 5.png', import.meta.url).toString());
    const forestSliceUrls = import.meta.glob('../../assets/forest/slices/*.png', {
      eager: true,
      as: 'url',
    }) as Record<string, string>;
    forestSlices.forEach((slice) => {
      const sliceUrl = forestSliceUrls[`../../assets/forest/slices/${slice.filename}`];
      if (sliceUrl) {
        this.load.image(slice.key, sliceUrl);
      }
    });
  }

  create(): void {
    void this.playIntro();
  }

  private async playIntro(): Promise<void> {
    const { MainMenuScene } = await import('./MainMenuScene');
    this.scene.add(SceneKeys.MAIN_MENU, MainMenuScene, false);
    this.finishPreload();

    if (!this.cache.video.exists('intro')) {
      this.scene.start(SceneKeys.MAIN_MENU);
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const intro = this.add.video(width / 2, height / 2, 'intro');
    intro.setOrigin(0.5);
    intro.setVisible(false);
    intro.setDepth(100);
    intro.setMute(false);
    intro.setVolume(1);
    this.introVideo = intro;

    const videoEl = (intro as Phaser.GameObjects.Video & { video?: HTMLVideoElement | null }).video;
    if (videoEl) {
      videoEl.style.pointerEvents = 'none';
    }

    intro.once('created', (_video: Phaser.GameObjects.Video, sourceWidth: number, sourceHeight: number) => {
      this.introSourceWidth = sourceWidth;
      this.introSourceHeight = sourceHeight;
      this.layoutIntro(intro, this.scale.width, this.scale.height);
      intro.setVisible(true);
    });

    intro.once('complete', () => {
      intro.destroy();
      this.introVideo = undefined;
      this.spaceKey?.off('down');
      this.skipButton?.destroy();
      this.introStartButton?.destroy();
      this.scene.start(SceneKeys.MAIN_MENU);
    });
    intro.once('error', () => {
      intro.destroy();
      this.introVideo = undefined;
      this.spaceKey?.off('down');
      this.skipButton?.destroy();
      this.introStartButton?.destroy();
      this.scene.start(SceneKeys.MAIN_MENU);
    });

    this.createSkipButton(() => {
      if (intro.isPlaying()) {
        intro.stop();
      }
      intro.destroy();
      this.introVideo = undefined;
      this.spaceKey?.off('down');
      this.skipButton?.destroy();
      this.introStartButton?.destroy();
      this.scene.start(SceneKeys.MAIN_MENU);
    });
    this.layoutSkipButton(width, height, getTextScale(width, height));
    this.skipButton?.setDepth(110);
    this.skipButton?.setVisible(false);

    this.createStartButton(() => {
      const started = intro.play(false);
      if (started) {
        this.introStartButton?.destroy();
        this.introStartButton = undefined;
        this.skipButton?.setVisible(true);
      }
    });
    this.layoutStartButton(width, height, getTextScale(width, height));
    this.introStartButton?.setDepth(120);

    this.spaceKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, true);
    this.spaceKey?.on('down', () => {
      if (intro.isPlaying()) {
        intro.stop();
      }
      intro.destroy();
      this.introVideo = undefined;
      this.skipButton?.destroy();
      this.introStartButton?.destroy();
      this.scene.start(SceneKeys.MAIN_MENU);
    });
  }

  private finishPreload(): void {
    this.progressTimer?.remove();
    this.setProgress(100);
    this.progressBox?.destroy();
    this.progressBar?.destroy();
    this.progressText?.destroy();
    if (this.resizeHandler) {
      this.scale.off('resize', this.resizeHandler);
    }
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
    if (this.skipButtonLabel) {
      this.skipButtonLabel.setStyle({ font: toFont(16, scale) });
      this.redrawSkipButton();
    }
    if (this.introStartLabel) {
      this.introStartLabel.setStyle({ font: toFont(18, scale) });
      this.redrawStartButton();
    }
  }

  private createSkipButton(onSkip: () => void): void {
    this.skipButtonBg = this.add.graphics();
    this.skipButtonLabel = this.add.text(0, 0, 'Пропустить', {
      font: toFont(16, getTextScale(this.scale.width, this.scale.height)),
      color: '#0d0f1d',
    });
    this.skipButtonLabel.setOrigin(0.5);
    this.skipButton = this.add.container(0, 0, [this.skipButtonBg, this.skipButtonLabel]);
    this.redrawSkipButton();

    const hit = this.add.zone(0, 0, 1, 1);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => this.redrawSkipButton(0xffd447));
    hit.on('pointerout', () => this.redrawSkipButton(0xffe066));
    hit.on('pointerup', () => {
      this.sound.play('sfx-button-click', { volume: 0.6 });
      onSkip();
    });
    this.skipButton.addAt(hit, 0);
    this.skipButton.setData('hitZone', hit);
    this.updateSkipButtonHitArea();
  }

  private redrawSkipButton(color: number = 0xffe066): void {
    if (!this.skipButtonBg || !this.skipButtonLabel) {
      return;
    }
    const paddingX = 18;
    const paddingY = 10;
    const width = this.skipButtonLabel.width * this.skipButtonLabel.scaleX + paddingX * 2;
    const height = this.skipButtonLabel.height * this.skipButtonLabel.scaleY + paddingY * 2;
    this.skipButtonBg.clear();
    this.skipButtonBg.fillStyle(color, 1);
    this.skipButtonBg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    this.updateSkipButtonHitArea(width, height);
  }

  private updateSkipButtonHitArea(width?: number, height?: number): void {
    if (!this.skipButton || !this.skipButtonLabel) {
      return;
    }
    const actualWidth = width ?? this.skipButtonLabel.width * this.skipButtonLabel.scaleX + 36;
    const actualHeight = height ?? this.skipButtonLabel.height * this.skipButtonLabel.scaleY + 20;
    const hitZone = this.skipButton.getData('hitZone') as Phaser.GameObjects.Zone | undefined;
    if (hitZone) {
      hitZone.setSize(actualWidth, actualHeight);
    }
    this.skipButton.setSize(actualWidth, actualHeight);
  }

  private layoutSkipButton(width: number, height: number, scale: number): void {
    if (!this.skipButton || !this.skipButtonLabel) {
      return;
    }
    this.skipButtonLabel.setStyle({ font: toFont(16, scale) });
    this.redrawSkipButton();
    this.skipButton.setPosition(width / 2, height - 48);
  }

  private createStartButton(onStart: () => void): void {
    this.introStartBg = this.add.graphics();
    this.introStartLabel = this.add.text(0, 0, 'Старт', {
      font: toFont(18, getTextScale(this.scale.width, this.scale.height)),
      color: '#0d0f1d',
    });
    this.introStartLabel.setOrigin(0.5);
    this.introStartButton = this.add.container(0, 0, [this.introStartBg, this.introStartLabel]);
    this.redrawStartButton();

    const hit = this.add.zone(0, 0, 1, 1);
    hit.setOrigin(0.5);
    hit.setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => this.redrawStartButton(0xffd447));
    hit.on('pointerout', () => this.redrawStartButton(0xffe066));
    hit.on('pointerup', () => {
      this.sound.play('sfx-button-click', { volume: 0.6 });
      onStart();
    });
    this.introStartButton.addAt(hit, 0);
    this.introStartButton.setData('hitZone', hit);
    this.updateStartButtonHitArea();
  }

  private redrawStartButton(color: number = 0xffe066): void {
    if (!this.introStartBg || !this.introStartLabel) {
      return;
    }
    const paddingX = 22;
    const paddingY = 12;
    const width = this.introStartLabel.width * this.introStartLabel.scaleX + paddingX * 2;
    const height = this.introStartLabel.height * this.introStartLabel.scaleY + paddingY * 2;
    this.introStartBg.clear();
    this.introStartBg.fillStyle(color, 1);
    this.introStartBg.fillRoundedRect(-width / 2, -height / 2, width, height, 14);
    this.updateStartButtonHitArea(width, height);
  }

  private updateStartButtonHitArea(width?: number, height?: number): void {
    if (!this.introStartButton || !this.introStartLabel) {
      return;
    }
    const actualWidth = width ?? this.introStartLabel.width * this.introStartLabel.scaleX + 44;
    const actualHeight = height ?? this.introStartLabel.height * this.introStartLabel.scaleY + 24;
    const hitZone = this.introStartButton.getData('hitZone') as Phaser.GameObjects.Zone | undefined;
    if (hitZone) {
      hitZone.setSize(actualWidth, actualHeight);
    }
    this.introStartButton.setSize(actualWidth, actualHeight);
  }

  private layoutStartButton(width: number, height: number, scale: number): void {
    if (!this.introStartButton || !this.introStartLabel) {
      return;
    }
    this.introStartLabel.setStyle({ font: toFont(18, scale) });
    this.redrawStartButton();
    this.introStartButton.setPosition(width / 2, height / 2);
  }

  private layoutIntro(
    intro: Phaser.GameObjects.Video,
    width: number,
    height: number
  ): void {
    const sourceWidth = this.introSourceWidth;
    const sourceHeight = this.introSourceHeight;
    if (!sourceWidth || !sourceHeight) {
      return;
    }
    const maxWidth = width * 0.8;
    const maxHeight = height * 0.8;
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    intro.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
  }
}
