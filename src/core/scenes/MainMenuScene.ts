import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../constants/GameEvents';

export class MainMenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Text;
  private howToButton!: Phaser.GameObjects.Text;

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

    this.subtitleText = this.add.text(0, 0, 'Collect the wishes and beat the clock!', {
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

    this.layout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
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

  private layout(width: number, height: number): void {
    const centerX = width / 2;
    this.titleText.setPosition(centerX, height * (130 / GAME_HEIGHT));
    this.subtitleText.setPosition(centerX, height * (190 / GAME_HEIGHT));
    this.startButton.setPosition(centerX, height * (300 / GAME_HEIGHT));
    this.howToButton.setPosition(centerX, height * (360 / GAME_HEIGHT));

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

    const text = this.add.text(modal.x, modal.y, 'Move with arrows or WASD\nCollect glowing wishes\nBeat your best time!', {
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
