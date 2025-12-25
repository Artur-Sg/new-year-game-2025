import Phaser from 'phaser';
import { GAME_HEIGHT, getTextScale, toFont } from '../config/gameConfig';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../constants/GameEvents';
import { PlayerSkin } from '../config/playerSkins';
import { getActiveSkin, setActiveSkin } from '../state/playerSkinStore';
import { getActiveLevelId, getUnlockedLevelId, setActiveLevelId } from '../state/levelStore';

export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Text;
  private howToButton!: Phaser.GameObjects.Text;
  private skinLabel!: Phaser.GameObjects.Text;
  private levelLabel!: Phaser.GameObjects.Text;
  private isStarting = false;
  private selectedLevelId = 1;
  private readonly fontSizes = {
    title: 36,
    subtitle: 16,
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
    frame: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    skin: PlayerSkin;
  }> = [];
  private levelOptions: Array<{
    container: Phaser.GameObjects.Container;
    frame: Phaser.GameObjects.Rectangle;
    label: Phaser.GameObjects.Text;
    level: number;
  }> = [];
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;

  constructor() {
    super(SceneKeys.MAIN_MENU);
  }

  create(): void {
    this.isStarting = false;
    this.titleText = this.add.text(0, 0, 'New Year Game 2025', {
      color: '#ffffff',
      font: toFont(this.fontSizes.title, getTextScale(this.scale.width, this.scale.height)),
    });
    this.titleText.setOrigin(0.5);

    this.subtitleText = this.add.text(0, 0, "Fly and collect Santa's lost gifts!", {
      color: '#a5c6ff',
      align: 'center',
      wordWrap: { width: 540 },
      font: toFont(this.fontSizes.subtitle, getTextScale(this.scale.width, this.scale.height)),
    });
    this.subtitleText.setOrigin(0.5);

    this.startButton = this.createButton(0, 0, 'Start');
    this.startButton.on('pointerup', () => {
      void this.startGame();
    });

    this.howToButton = this.createButton(0, 0, 'How to play')
      .on('pointerup', () => this.showHowToPlay());

    this.createSkinPicker();
    this.createLevelPicker();

    this.layout(this.scale.width, this.scale.height);
    this.resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    };
    this.scale.on('resize', this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.resizeHandler) {
        this.scale.off('resize', this.resizeHandler);
      }
    });
  }

  private async startGame(): Promise<void> {
    if (this.isStarting) {
      return;
    }
    this.isStarting = true;

    setActiveLevelId(this.selectedLevelId);

    this.startButton.disableInteractive();
    this.howToButton.disableInteractive();
    this.startButton.setAlpha(0.7);
    this.howToButton.setAlpha(0.7);

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
    const text = this.add.text(centerX, centerY + 40, 'Loading... 0%', {
      color: '#a5c6ff',
      font: toFont(this.fontSizes.loading, getTextScale(width, height)),
    });
    text.setOrigin(0.5);

    const setProgress = (value: number) => {
      bar.width = 300 * (value / 100);
      text.setText(`Loading... ${value}%`);
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

  private createButton(x: number, y: number, label: string): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      color: '#0d0f1d',
      backgroundColor: '#ffe066',
      padding: { x: 16, y: 10 },
      font: toFont(this.fontSizes.button, getTextScale(this.scale.width, this.scale.height)),
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true })
      .on('pointerover', () => button.setStyle({ backgroundColor: '#ffd447' }))
      .on('pointerout', () => button.setStyle({ backgroundColor: '#ffe066' }));

    return button;
  }

  private createSkinPicker(): void {
    this.skinLabel = this.add.text(0, 0, 'Choose your cat', {
      color: '#ffffff',
      font: toFont(this.fontSizes.skinLabel, getTextScale(this.scale.width, this.scale.height)),
    });
    this.skinLabel.setOrigin(0.5);

    const options: Array<{ skin: PlayerSkin; label: string; texture: string; scale: number }> = [
      { skin: 'cat-hero', label: 'Пухляш', texture: 'cat-hero', scale: 1.5 },
      { skin: 'xmascat', label: 'Плюша', texture: 'xmascat', scale: 0.35 },
    ];

    this.skinOptions = options.map((option) => {
      const frame = this.add.rectangle(0, 0, 140, 120, 0x0b0d1a, 0.9);
      frame.setStrokeStyle(2, 0x334155, 0.8);

      const sprite = this.add.sprite(0, -6, option.texture, 0);
      sprite.setScale(option.scale);

      const text = this.add.text(0, 50, option.label, {
        color: '#a5c6ff',
        font: toFont(this.fontSizes.skinOption, getTextScale(this.scale.width, this.scale.height)),
      });
      text.setOrigin(0.5);

      const container = this.add.container(0, 0, [frame, sprite, text]);
      frame.setInteractive({ useHandCursor: true })
        .on('pointerover', () => frame.setStrokeStyle(2, 0xffd447, 0.9))
        .on('pointerout', () => this.updateSkinSelection())
        .on('pointerup', () => {
          setActiveSkin(option.skin);
          this.updateSkinSelection();
        });

      return { container, frame, label: text, skin: option.skin };
    });

    this.updateSkinSelection();
  }

  private createLevelPicker(): void {
    this.selectedLevelId = Math.min(getActiveLevelId(), getUnlockedLevelId());
    this.levelLabel = this.add.text(0, 0, 'Choose level', {
      color: '#ffffff',
      font: toFont(this.fontSizes.levelLabel, getTextScale(this.scale.width, this.scale.height)),
    });
    this.levelLabel.setOrigin(0.5);

    const maxUnlocked = getUnlockedLevelId();
    const levels = [1, 2, 3, 4];

    this.levelOptions = levels.map((level) => {
      const frame = this.add.rectangle(0, 0, 56, 56, 0x0b0d1a, 0.9);
      frame.setStrokeStyle(2, 0x334155, 0.8);

      const text = this.add.text(0, 0, String(level), {
        color: '#a5c6ff',
        font: toFont(this.fontSizes.levelOption, getTextScale(this.scale.width, this.scale.height)),
      });
      text.setOrigin(0.5);

      const container = this.add.container(0, 0, [frame, text]);

      if (level <= maxUnlocked) {
        frame.setInteractive({ useHandCursor: true })
          .on('pointerover', () => frame.setStrokeStyle(2, 0xffd447, 0.9))
          .on('pointerout', () => this.updateLevelSelection())
          .on('pointerup', () => {
            this.selectedLevelId = level;
            this.updateLevelSelection();
          });
      } else {
        container.setAlpha(0.35);
      }

      return { container, frame, label: text, level };
    });

    this.updateLevelSelection();
  }

  private updateSkinSelection(): void {
    const current = getActiveSkin();
    this.skinOptions.forEach((option) => {
      if (option.skin === current) {
        option.frame.setStrokeStyle(3, 0xffe066, 1);
      } else {
        option.frame.setStrokeStyle(2, 0x334155, 0.8);
      }
    });
  }

  private updateLevelSelection(): void {
    this.levelOptions.forEach((option) => {
      if (option.level === this.selectedLevelId) {
        option.frame.setStrokeStyle(3, 0xffe066, 1);
        option.label.setColor('#ffffff');
      } else {
        option.frame.setStrokeStyle(2, 0x334155, 0.8);
        option.label.setColor('#a5c6ff');
      }
    });
  }

  private layout(width: number, height: number): void {
    this.updateTypography(getTextScale(width, height));
    const centerX = width / 2;
    this.titleText.setPosition(centerX, height * (110 / GAME_HEIGHT));
    this.subtitleText.setPosition(centerX, height * (170 / GAME_HEIGHT));
    this.skinLabel.setPosition(centerX, height * (220 / GAME_HEIGHT));
    const optionsY = height * (270 / GAME_HEIGHT);
    const spacing = Math.min(180, Math.max(140, width / 3));
    this.skinOptions.forEach((option, index) => {
      option.container.setPosition(centerX + (index === 0 ? -spacing : spacing), optionsY);
    });

    this.levelLabel.setPosition(centerX, height * (330 / GAME_HEIGHT));
    const levelY = height * (380 / GAME_HEIGHT);
    const levelSpacing = Math.min(80, Math.max(56, width / 6));
    this.levelOptions.forEach((option, index) => {
      option.container.setPosition(centerX + (index - 1.5) * levelSpacing, levelY);
    });

    this.startButton.setPosition(centerX, height * (440 / GAME_HEIGHT));
    this.howToButton.setPosition(centerX, height * (500 / GAME_HEIGHT));

    const wrapWidth = Math.min(540, Math.max(280, width - 120));
    this.subtitleText.setWordWrapWidth(wrapWidth);
  }

  private showHowToPlay(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const modalWidth = Math.min(520, Math.max(320, width - 80));
    const modalHeight = Math.min(220, Math.max(180, height - 120));
    const modal = this.add.rectangle(width / 2, height / 2, modalWidth, modalHeight, 0x0b0d1a, 0.9);
    modal.setStrokeStyle(3, 0xffe066, 0.8);

    const scale = getTextScale(width, height);
    const text = this.add.text(modal.x, modal.y, 'Fly with arrows or WASD\nCollect 10 gifts\nFinish the level!', {
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: modalWidth - 40 },
      font: toFont(this.fontSizes.howTo, scale),
    });
    text.setOrigin(0.5);

    this.time.delayedCall(2200, () => {
      modal.destroy();
      text.destroy();
    });
  }

  private updateTypography(scale: number): void {
    this.titleText.setStyle({ font: toFont(this.fontSizes.title, scale) });
    this.subtitleText.setStyle({ font: toFont(this.fontSizes.subtitle, scale) });
    this.startButton.setStyle({ font: toFont(this.fontSizes.button, scale) });
    this.howToButton.setStyle({ font: toFont(this.fontSizes.button, scale) });
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
