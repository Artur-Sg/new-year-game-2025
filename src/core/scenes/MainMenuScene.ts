import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/gameConfig';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../constants/GameEvents';
import { PlayerSkin } from '../config/playerSkins';
import { getActiveSkin, setActiveSkin } from '../state/playerSkinStore';

export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Text;
  private howToButton!: Phaser.GameObjects.Text;
  private skinLabel!: Phaser.GameObjects.Text;
  private skinOptions: Array<{
    container: Phaser.GameObjects.Container;
    frame: Phaser.GameObjects.Rectangle;
    skin: PlayerSkin;
  }> = [];
  private resizeHandler?: (gameSize: Phaser.Structs.Size) => void;

  constructor() {
    super(SceneKeys.MAIN_MENU);
  }

  create(): void {
    this.titleText = this.add.text(0, 0, 'New Year Game 2025', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Press Start 2P, monospace',
    });
    this.titleText.setOrigin(0.5);

    this.subtitleText = this.add.text(0, 0, "Fly and collect Santa's lost gifts!", {
      fontSize: '12px',
      color: '#a5c6ff',
      align: 'center',
      wordWrap: { width: 540 },
      fontFamily: 'Press Start 2P, monospace',
    });
    this.subtitleText.setOrigin(0.5);

    this.startButton = this.createButton(0, 0, 'Start');
    this.startButton.on('pointerup', () => {
      EventBus.emit(GameEvents.START);
      this.scene.start(SceneKeys.GAME);
      this.scene.launch(SceneKeys.UI);
    });

    this.howToButton = this.createButton(0, 0, 'How to play')
      .on('pointerup', () => this.showHowToPlay());

    this.createSkinPicker();

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

  private createButton(x: number, y: number, label: string): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontSize: '16px',
      color: '#0d0f1d',
      backgroundColor: '#ffe066',
      padding: { x: 16, y: 10 },
      fontFamily: 'Press Start 2P, monospace',
    });

    button.setOrigin(0.5);
    button.setInteractive({ useHandCursor: true })
      .on('pointerover', () => button.setStyle({ backgroundColor: '#ffd447' }))
      .on('pointerout', () => button.setStyle({ backgroundColor: '#ffe066' }));

    return button;
  }

  private createSkinPicker(): void {
    this.skinLabel = this.add.text(0, 0, 'Choose your cat', {
      fontSize: '12px',
      color: '#ffffff',
      fontFamily: 'Press Start 2P, monospace',
    });
    this.skinLabel.setOrigin(0.5);

    const options: Array<{ skin: PlayerSkin; label: string; texture: string; scale: number }> = [
      { skin: 'cat-hero', label: 'Classic', texture: 'cat-hero', scale: 1.5 },
      { skin: 'xmascat', label: 'Xmas', texture: 'xmascat', scale: 0.35 },
    ];

    this.skinOptions = options.map((option) => {
      const frame = this.add.rectangle(0, 0, 140, 120, 0x0b0d1a, 0.9);
      frame.setStrokeStyle(2, 0x334155, 0.8);

      const sprite = this.add.sprite(0, -6, option.texture, 0);
      sprite.setScale(option.scale);

      const text = this.add.text(0, 50, option.label, {
        fontSize: '10px',
        color: '#a5c6ff',
        fontFamily: 'Press Start 2P, monospace',
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

      return { container, frame, skin: option.skin };
    });

    this.updateSkinSelection();
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

  private layout(width: number, height: number): void {
    const centerX = width / 2;
    this.titleText.setPosition(centerX, height * (130 / GAME_HEIGHT));
    this.subtitleText.setPosition(centerX, height * (190 / GAME_HEIGHT));
    this.skinLabel.setPosition(centerX, height * (240 / GAME_HEIGHT));
    const optionsY = height * (300 / GAME_HEIGHT);
    const spacing = Math.min(180, Math.max(140, width / 3));
    this.skinOptions.forEach((option, index) => {
      option.container.setPosition(centerX + (index === 0 ? -spacing : spacing), optionsY);
    });

    this.startButton.setPosition(centerX, height * (380 / GAME_HEIGHT));
    this.howToButton.setPosition(centerX, height * (440 / GAME_HEIGHT));

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

    const text = this.add.text(modal.x, modal.y, 'Fly with arrows or WASD\nCollect 10 gifts\nFinish the level!', {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10,
      wordWrap: { width: modalWidth - 40 },
      fontFamily: 'Press Start 2P, monospace',
    });
    text.setOrigin(0.5);

    this.time.delayedCall(2200, () => {
      modal.destroy();
      text.destroy();
    });
  }
}
