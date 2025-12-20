import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';
import { GameEvents } from '../constants/GameEvents';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.MAIN_MENU);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const title = this.add.text(centerX, 130, 'New Year Game 2025', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Press Start 2P, monospace',
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(centerX, 190, 'Collect the wishes and beat the clock!', {
      fontSize: '12px',
      color: '#a5c6ff',
      align: 'center',
      wordWrap: { width: 540 },
      fontFamily: 'Press Start 2P, monospace',
    });
    subtitle.setOrigin(0.5);

    const startButton = this.createButton(centerX, 300, 'Start');
    startButton.on('pointerup', () => {
      EventBus.emit(GameEvents.START);
      this.scene.start(SceneKeys.GAME);
      this.scene.launch(SceneKeys.UI);
    });

    this.createButton(centerX, 360, 'How to play')
      .on('pointerup', () => this.showHowToPlay());
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

  private showHowToPlay(): void {
    const modal = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 520, 220, 0x0b0d1a, 0.9);
    modal.setStrokeStyle(3, 0xffe066, 0.8);

    const text = this.add.text(modal.x, modal.y, 'Move with arrows or WASD\nCollect glowing wishes\nBeat your best time!', {
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 10,
      fontFamily: 'Press Start 2P, monospace',
    });
    text.setOrigin(0.5);

    this.time.delayedCall(2200, () => {
      modal.destroy();
      text.destroy();
    });
  }
}
