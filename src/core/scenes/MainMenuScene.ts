import Phaser from 'phaser';
import { GAME_HEIGHT, getTextScale, toFont } from '../config/gameConfig';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../constants/GameEvents';
import { PlayerSkin } from '../config/playerSkins';
import { getActiveSkin, setActiveSkin } from '../state/playerSkinStore';
import { getActiveLevelId, getUnlockedLevelId, setActiveLevelId } from '../state/levelStore';
import { getBonusRecord } from '../state/bonusRecordStore';

type RoundedButton = {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  width: number;
  height: number;
  radius: number;
  paddingX: number;
  paddingY: number;
  fillColor: number;
  fillAlpha: number;
  hoverColor: number;
  hoverAlpha: number;
  minWidth: number;
};

export class MainMenuScene extends Phaser.Scene {
  private backgroundImage?: Phaser.GameObjects.Image;
  private backgroundShade?: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private startButton!: RoundedButton;
  private howToButton!: RoundedButton;
  private skinLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private bonusRecordText!: Phaser.GameObjects.Text;
  private menuMusic?: Phaser.Sound.BaseSound;
  private isStarting = false;
  private selectedLevelId = 1;
  private readonly fontSizes = {
    title: 36,
    subtitle: 18,
    button: 20,
    skinLabel: 16,
    skinOption: 14,
    loading: 16,
    howTo: 18,
    levelLabel: 16,
    levelOption: 16,
  };
  private skinOptions: Array<{
    container: Phaser.GameObjects.Container;
    frame: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    skin: PlayerSkin;
  }> = [];
  private levelOptions: Array<{
    container: Phaser.GameObjects.Container;
    frame: Phaser.GameObjects.Graphics;
    label: Phaser.GameObjects.Text;
    level: number;
  }> = [];
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;
  private debugKeyHandler?: (event: KeyboardEvent) => void;
  private readonly skinFrameSize = { width: 170, height: 140, radius: 16 };
  private readonly levelFrameSize = { width: 56, height: 56, radius: 12 };

  constructor() {
    super(SceneKeys.MAIN_MENU);
  }

  create(): void {
    this.isStarting = false;
    this.playMenuMusic();
    this.backgroundImage = this.add.image(0, 0, 'menu-background').setOrigin(0, 0);
    this.backgroundImage.setDepth(-1);
    this.backgroundShade = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b0d1a, 0.35);
    this.backgroundShade.setOrigin(0, 0);
    this.backgroundShade.setDepth(-0.5);
    this.titleText = this.add.text(0, 0, 'Супер-кот спасает Новый Год!', {
      color: '#ffffff',
      font: toFont(this.fontSizes.title, getTextScale(this.scale.width, this.scale.height)),
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setStroke('#0b0d1a', 4);
    this.titleText.setShadow(2, 2, '#0b0d1a', 4, false, true);

    this.subtitleText = this.add.text(0, 0, 'Помоги Деду Морозу собрать упавшие подарки', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 540 },
      font: toFont(this.fontSizes.subtitle, getTextScale(this.scale.width, this.scale.height)),
    });
    this.subtitleText.setOrigin(0.5);
    this.subtitleText.setStroke('#0b0d1a', 3);
    this.subtitleText.setShadow(2, 2, '#0b0d1a', 4, false, true);

    this.startButton = this.createRoundedButton(0, 0, 'Старт');
    this.startButton.container.on('pointerup', () => {
      this.sound.play('sfx-game-start', { volume: 0.7 });
      void this.startGame();
    });

    this.howToButton = this.createRoundedButton(0, 0, 'Как играть');
    this.howToButton.container
      .on('pointerup', () => {
        this.sound.play('sfx-button-click', { volume: 0.6 });
        this.showHowToPlay();
      });

    this.createSkinPicker();
    this.createLevelPicker();
    this.createBonusRecord();

    this.layout(this.scale.width, this.scale.height);
    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.stopMenuMusic();
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
      }
      if (this.debugKeyHandler) {
        this.input.keyboard?.off('keydown', this.debugKeyHandler);
      }
    });
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      this.updateBonusRecordText();
      this.playMenuMusic();
    });

    this.debugKeyHandler = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) {
        return;
      }
      const code = event.code;
      const key = event.key;
      const isKey7 = code === 'Digit7' || code === 'Numpad7' || key === '7';
      if (!isKey7) {
        return;
      }
      if (getUnlockedLevelId() < 7) {
        return;
      }
      this.selectedLevelId = 7;
      this.updateLevelSelection();
      this.sound.play('sfx-game-start', { volume: 0.7 });
      void this.startGame();
    };
    this.input.keyboard?.on('keydown', this.debugKeyHandler);
  }

  private async startGame(): Promise<void> {
    if (this.isStarting) {
      return;
    }
    this.isStarting = true;
    this.stopMenuMusic();

    setActiveLevelId(this.selectedLevelId);

    this.startButton.container.disableInteractive();
    this.howToButton.container.disableInteractive();
    this.startButton.container.setAlpha(0.7);
    this.howToButton.container.setAlpha(0.7);

    const loading = this.createLoadingOverlay();
    loading.start();

    try {
      const [{ GameScene }, { UIScene }] = await Promise.all([
        import('./GameScene'),
        import('./UIScene'),
      ]);

      if (!this.scene.get(SceneKeys.GAME)) {
        this.scene.add(SceneKeys.GAME, GameScene, false);
      }
      if (!this.scene.get(SceneKeys.UI)) {
        this.scene.add(SceneKeys.UI, UIScene, false);
      }
    } finally {
      loading.finish();
    }

    EventBus.emit(GameEvents.START);
    this.scene.start(SceneKeys.GAME);
    this.scene.launch(SceneKeys.UI);
  }

  private createLoadingOverlay(): { start: () => void; finish: () => void } {
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const backdrop = this.add.rectangle(centerX, centerY, width, height, 0x0b0d1a, 0.9);
    const box = this.add.rectangle(centerX, centerY, 320, 32, 0x1f2433, 0.9);
    const bar = this.add.rectangle(centerX - 150, centerY, 0, 16, 0xffe066, 1);
    const text = this.add.text(centerX, centerY + 40, 'Загрузка... 0%', {
      color: '#a5c6ff',
      font: toFont(this.fontSizes.loading, getTextScale(width, height)),
    });
    text.setOrigin(0.5);
    text.setStroke('#0b0d1a', 3);
    text.setShadow(2, 2, '#0b0d1a', 4, false, true);

    const setProgress = (value: number) => {
      bar.width = 300 * (value / 100);
      text.setText(`Загрузка... ${value}%`);
    };

    let progressValue = 0;
    let timer: Phaser.Time.TimerEvent | undefined;

    return {
      start: () => {
        setProgress(0);
        timer = this.time.addEvent({
          delay: 30,
          loop: true,
          callback: () => {
            if (progressValue < 95) {
              progressValue += 1;
              setProgress(progressValue);
            }
          },
        });
      },
      finish: () => {
        timer?.remove();
        setProgress(100);
        this.time.delayedCall(120, () => {
          backdrop.destroy();
          box.destroy();
          bar.destroy();
          text.destroy();
        });
      },
    };
  }

  private playMenuMusic(): void {
    if (!this.menuMusic) {
      this.menuMusic = this.sound.add('bgm-menu', { loop: true, volume: 0.22 });
    }
    if (!this.menuMusic.isPlaying) {
      this.menuMusic.play();
    }
  }

  private stopMenuMusic(): void {
    this.menuMusic?.stop();
  }

  private createRoundedButton(x: number, y: number, label: string): RoundedButton {
    const background = this.add.graphics();
    const text = this.add.text(0, 0, label, {
      color: '#0d0f1d',
      font: toFont(this.fontSizes.button, getTextScale(this.scale.width, this.scale.height)),
    });
    text.setOrigin(0.5);

    const button: RoundedButton = {
      container: this.add.container(x, y, [background, text]),
      background,
      label: text,
      width: 0,
      height: 0,
      radius: 14,
      paddingX: 18,
      paddingY: 10,
      fillColor: 0xffe066,
      fillAlpha: 1,
      hoverColor: 0xffd447,
      hoverAlpha: 1,
      minWidth: 0,
    };

    this.updateRoundedButton(button, getTextScale(this.scale.width, this.scale.height));

    button.container.setInteractive(
      new Phaser.Geom.Rectangle(-button.width / 2, -button.height / 2, button.width, button.height),
      Phaser.Geom.Rectangle.Contains
    );
    if (button.container.input) {
      button.container.input.cursor = 'pointer';
    }
    button.container
      .on('pointerover', () => this.drawRoundedRect(button, button.hoverColor, button.hoverAlpha))
      .on('pointerout', () => this.drawRoundedRect(button, button.fillColor, button.fillAlpha));

    return button;
  }

  private updateRoundedButton(button: RoundedButton, scale: number): void {
    button.label.setStyle({ font: toFont(this.fontSizes.button, scale) });
    const bounds = button.label.getBounds();
    button.width = Math.max(button.minWidth, bounds.width + button.paddingX * 2);
    button.height = bounds.height + button.paddingY * 2;
    this.drawRoundedRect(button, button.fillColor, button.fillAlpha);
  }

  private drawRoundedRect(button: RoundedButton, fillColor: number, fillAlpha: number): void {
    button.background.clear();
    button.background.fillStyle(fillColor, fillAlpha);
    button.background.fillRoundedRect(
      -button.width / 2,
      -button.height / 2,
      button.width,
      button.height,
      button.radius
    );
  }

  private createSkinPicker(): void {
    this.skinLabel = this.add.text(0, 0, 'Выбери героя:', {
      color: '#ffffff',
      font: toFont(this.fontSizes.skinLabel, getTextScale(this.scale.width, this.scale.height)),
    });
    this.skinLabel.setOrigin(0.5);
    this.skinLabel.setStroke('#0b0d1a', 3);
    this.skinLabel.setShadow(2, 2, '#0b0d1a', 4, false, true);

    const options: Array<{ skin: PlayerSkin; label: string; texture: string; scale: number }> = [
      { skin: 'cat-hero', label: 'Пухляш', texture: 'cat-hero', scale: 1.5 },
      { skin: 'xmascat', label: 'Плюша', texture: 'xmascat', scale: 0.35 },
    ];

    this.skinOptions = options.map((option) => {
      const frame = this.add.graphics();
      this.drawRoundedFrame(frame, this.skinFrameSize, 0x334155);

      const sprite = this.add.sprite(0, -4, option.texture, 0);
      sprite.setScale(option.scale);

      const text = this.add.text(0, 46, option.label, {
        color: '#a5c6ff',
        font: toFont(this.fontSizes.skinOption, getTextScale(this.scale.width, this.scale.height)),
      });
      text.setOrigin(0.5);
      text.setStroke('#0b0d1a', 3);
      text.setShadow(2, 2, '#0b0d1a', 4, false, true);

      const container = this.add.container(0, 0, [frame, sprite, text]);
      frame.setInteractive(
        new Phaser.Geom.Rectangle(
          -this.skinFrameSize.width / 2,
          -this.skinFrameSize.height / 2,
          this.skinFrameSize.width,
          this.skinFrameSize.height
        ),
        Phaser.Geom.Rectangle.Contains
      )
        .on('pointerover', () => this.drawRoundedFrame(frame, this.skinFrameSize, 0xffd447, 0.9))
        .on('pointerout', () => this.updateSkinSelection())
        .on('pointerup', () => {
          this.sound.play('sfx-button-click', { volume: 0.6 });
          setActiveSkin(option.skin);
          this.updateSkinSelection();
        });
      if (frame.input) {
        frame.input.cursor = 'pointer';
      }

      return { container, frame, label: text, skin: option.skin };
    });

    this.updateSkinSelection();
  }

  private createLevelPicker(): void {
    this.selectedLevelId = Math.min(getActiveLevelId(), getUnlockedLevelId());
    this.levelLabel = this.add.text(0, 0, 'Выбери уровень:', {
      color: '#ffffff',
      font: toFont(this.fontSizes.levelLabel, getTextScale(this.scale.width, this.scale.height)),
    });
    this.levelLabel.setOrigin(0.5);
    this.levelLabel.setStroke('#0b0d1a', 3);
    this.levelLabel.setShadow(2, 2, '#0b0d1a', 4, false, true);

    const maxUnlocked = getUnlockedLevelId();
    const levels = Array.from({ length: maxUnlocked }, (_, index) => index + 1);

    this.levelOptions = levels.map((level) => {
      const frame = this.add.graphics();
      this.drawRoundedFrame(frame, this.levelFrameSize, 0x334155);

      const label = level === 7 ? 'Бонус' : String(level);
      const text = this.add.text(0, 0, label, {
        color: '#a5c6ff',
        font: toFont(this.fontSizes.levelOption, getTextScale(this.scale.width, this.scale.height)),
      });
      text.setOrigin(0.5);
      text.setStroke('#0b0d1a', 3);
      text.setShadow(2, 2, '#0b0d1a', 4, false, true);

      const container = this.add.container(0, 0, [frame, text]);

      frame.setInteractive(
        new Phaser.Geom.Rectangle(
          -this.levelFrameSize.width / 2,
          -this.levelFrameSize.height / 2,
          this.levelFrameSize.width,
          this.levelFrameSize.height
        ),
        Phaser.Geom.Rectangle.Contains
      )
        .on('pointerover', () => this.drawRoundedFrame(frame, this.levelFrameSize, 0xffd447, 0.9))
        .on('pointerout', () => this.updateLevelSelection())
        .on('pointerup', () => {
          this.sound.play('sfx-button-click', { volume: 0.6 });
          this.selectedLevelId = level;
          this.updateLevelSelection();
        });
      if (frame.input) {
        frame.input.cursor = 'pointer';
      }

      return { container, frame, label: text, level };
    });

    this.updateLevelSelection();
  }

  private updateSkinSelection(): void {
    const current = getActiveSkin();
    this.skinOptions.forEach((option) => {
      if (option.skin === current) {
        this.drawRoundedFrame(option.frame, this.skinFrameSize, 0xffe066, 1, 3);
        option.label.setColor('#ffffff');
      } else {
        this.drawRoundedFrame(option.frame, this.skinFrameSize, 0x334155, 0.8, 2);
        option.label.setColor('#a5c6ff');
      }
    });
  }

  private updateLevelSelection(): void {
    this.levelOptions.forEach((option) => {
      if (option.level === this.selectedLevelId) {
        this.drawRoundedFrame(option.frame, this.levelFrameSize, 0xffe066, 1, 3);
        option.label.setColor('#ffffff');
      } else {
        this.drawRoundedFrame(option.frame, this.levelFrameSize, 0x334155, 0.8, 2);
        option.label.setColor('#a5c6ff');
      }
    });
  }

  private createBonusRecord(): void {
    this.bonusRecordText = this.add.text(0, 0, '', {
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 520 },
      font: toFont(this.fontSizes.skinLabel, getTextScale(this.scale.width, this.scale.height)),
    });
    this.bonusRecordText.setOrigin(0.5);
    this.bonusRecordText.setStroke('#0b0d1a', 3);
    this.bonusRecordText.setShadow(2, 2, '#0b0d1a', 4, false, true);
    this.updateBonusRecordText();
  }

  private drawRoundedFrame(
    frame: Phaser.GameObjects.Graphics,
    size: { width: number; height: number; radius: number },
    strokeColor: number,
    strokeAlpha = 0.8,
    strokeWidth = 2
  ): void {
    frame.clear();
    frame.fillStyle(0x0b0d1a, 0.65);
    frame.fillRoundedRect(-size.width / 2, -size.height / 2, size.width, size.height, size.radius);
    frame.lineStyle(strokeWidth, strokeColor, strokeAlpha);
    frame.strokeRoundedRect(-size.width / 2, -size.height / 2, size.width, size.height, size.radius);
  }

  private updateBonusRecordText(): void {
    const record = getBonusRecord();
    this.bonusRecordText.setText(
      `Рекорд бонусного уровня: \n Подарки: ${record.gifts} Время: ${record.seconds}с`
    );
    this.bonusRecordText.setVisible(getUnlockedLevelId() >= 7);
  }

  private layout(width: number, height: number): void {
    this.updateTypography(getTextScale(width, height));
    if (this.backgroundImage) {
      this.backgroundImage.setDisplaySize(width, height);
    }
    if (this.backgroundShade) {
      this.backgroundShade.setSize(width, height);
    }
    const centerX = width / 2;
    const baseTop = height * (110 / GAME_HEIGHT);
    const baseBottom = height * (520 / GAME_HEIGHT);
    const offsetY = height / 2 - (baseTop + baseBottom) / 2;

    const titleY = baseTop + offsetY;
    const subtitleY = height * (170 / GAME_HEIGHT) + offsetY;
    const skinLabelY = height * (220 / GAME_HEIGHT) + offsetY;
    const optionsY = height * (270 / GAME_HEIGHT) + offsetY;
    const levelLabelY = height * (350 / GAME_HEIGHT) + offsetY;
    const levelY = height * (380 / GAME_HEIGHT) + offsetY;
    const bonusY = height * (430 / GAME_HEIGHT) + offsetY;
    const startY = height * (470 / GAME_HEIGHT) + offsetY;
    const howToY = height * (520 / GAME_HEIGHT) + offsetY;

    this.titleText.setPosition(centerX, titleY);
    this.subtitleText.setPosition(centerX, subtitleY);
    this.skinLabel.setPosition(centerX, skinLabelY);
    const spacing = Math.min(180, Math.max(140, width / 3));
    this.skinOptions.forEach((option, index) => {
      option.container.setPosition(centerX + (index === 0 ? -spacing : spacing), optionsY);
    });

    this.levelLabel.setPosition(centerX, levelLabelY);
    const levelSpacing = Math.min(72, Math.max(48, width / 7));
    const offset = (this.levelOptions.length - 1) / 2;
    this.levelOptions.forEach((option, index) => {
      option.container.setPosition(centerX + (index - offset) * levelSpacing, levelY);
    });

    this.bonusRecordText.setPosition(centerX, bonusY);

    this.startButton.container.setPosition(centerX, startY);
    this.howToButton.container.setPosition(centerX, howToY);

    const wrapWidth = Math.min(540, Math.max(280, width - 120));
    this.subtitleText.setWordWrapWidth(wrapWidth);
  }

  private showHowToPlay(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const modalWidth = Math.min(600, Math.max(400, width - 80));
    const modalHeight = Math.min(600, Math.max(200, height - 120));
    const modal = this.add.graphics();
    modal.fillStyle(0x0b0d1a, 0.9);
    modal.fillRoundedRect(
      width / 2 - modalWidth / 2,
      height / 2 - modalHeight / 2,
      modalWidth,
      modalHeight,
      16
    );
    modal.lineStyle(3, 0xffe066, 0.8);
    modal.strokeRoundedRect(
      width / 2 - modalWidth / 2,
      height / 2 - modalHeight / 2,
      modalWidth,
      modalHeight,
      16
    );

    const scale = getTextScale(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const text = this.add.text(centerX, centerY - 40, 'Летай на стрелках или WASD\nСобери 10 подарков, Пройди уровень! На некоторых уровнях необходимо будет стрелять используя ПРОБЕЛ', {
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: modalWidth - 40 },
      font: toFont(this.fontSizes.howTo, scale),
    });
    text.setOrigin(0.5);
    text.setStroke('#0b0d1a', 3);
    text.setShadow(2, 2, '#0b0d1a', 4, false, true);

    const button = this.createRoundedButton(centerX, centerY + modalHeight / 4, 'Понятно');
    button.container.setPosition(centerX, centerY + modalHeight / 4);
    button.container.on('pointerup', () => {
      this.sound.play('sfx-button-click', { volume: 0.6 });
      modal.destroy();
      text.destroy();
      button.container.destroy();
    });
  }

  private updateTypography(scale: number): void {
    this.titleText.setStyle({ font: toFont(this.fontSizes.title, scale) });
    this.subtitleText.setStyle({ font: toFont(this.fontSizes.subtitle, scale) });
    this.updateRoundedButton(this.startButton, scale);
    this.updateRoundedButton(this.howToButton, scale);
    this.skinLabel.setStyle({ font: toFont(this.fontSizes.skinLabel, scale) });
    this.levelLabel.setStyle({ font: toFont(this.fontSizes.levelLabel, scale) });
    this.skinOptions.forEach((option) => {
      option.label.setStyle({ font: toFont(this.fontSizes.skinOption, scale) });
    });
    this.levelOptions.forEach((option) => {
      option.label.setStyle({ font: toFont(this.fontSizes.levelOption, scale) });
    });
  }
}
