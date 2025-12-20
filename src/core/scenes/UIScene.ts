import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { GameEvents } from '../constants/GameEvents';
import { SceneKeys } from '../constants/SceneKeys';
import { EventBus } from '../events/EventBus';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private banner!: Phaser.GameObjects.Rectangle;
  private bannerCopy!: Phaser.GameObjects.Text;

  constructor() {
    super(SceneKeys.UI);
  }

  create(): void {
    this.scoreText = this.add.text(32, 24, 'Score: 0', {
      fontSize: '16px',
      color: '#ffe066',
      fontFamily: 'Press Start 2P, monospace',
    });

    this.timerText = this.add.text(GAME_WIDTH - 32, 24, 'Time: 0s', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Press Start 2P, monospace',
    });
    this.timerText.setOrigin(1, 0);

    this.createCallToAction();
    this.layout(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.layout(gameSize.width, gameSize.height);
    });

    EventBus.on(GameEvents.SCORE_UPDATED, this.updateScore, this);
    EventBus.on(GameEvents.TIMER_UPDATED, this.updateTimer, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      EventBus.off(GameEvents.SCORE_UPDATED, this.updateScore, this);
      EventBus.off(GameEvents.TIMER_UPDATED, this.updateTimer, this);
    });
  }

  private createCallToAction(): void {
    this.banner = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 36, 520, 64, 0x0f162a, 0.85);
    this.banner.setStrokeStyle(2, 0xffe066, 0.7);

    this.bannerCopy = this.add.text(this.banner.x, this.banner.y, 'Move to collect wishes. Beat your best time!', {
      fontSize: '12px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 480 },
      fontFamily: 'Press Start 2P, monospace',
    });
    this.bannerCopy.setOrigin(0.5);
  }

  private layout(width: number, height: number): void {
    this.scoreText.setPosition(32, 24);
    this.timerText.setPosition(width - 32, 24);

    const bannerWidth = Math.min(520, Math.max(320, width - 80));
    this.banner.setPosition(width / 2, height - 36);
    this.banner.setSize(bannerWidth, 64);
    this.bannerCopy.setPosition(this.banner.x, this.banner.y);
    this.bannerCopy.setWordWrapWidth(bannerWidth - 40);
  }

  private updateScore(score: number): void {
    this.scoreText.setText(`Score: ${score}`);
  }

  private updateTimer(seconds: number): void {
    this.timerText.setText(`Time: ${seconds}s`);
  }
}
