import Phaser from 'phaser';

export class BackdropEffect {
  private zone!: Phaser.GameObjects.Zone;
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private frame!: Phaser.GameObjects.Rectangle;

  constructor(private scene: Phaser.Scene) {}

  create(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    this.ensureSparkTexture();

    this.zone = this.scene.add.zone(width / 2, height / 2, width, height);
    this.emitter = this.scene.add.particles(this.zone.x, this.zone.y, 'spark', {
      quantity: 2,
      lifespan: { min: 1200, max: 2400 },
      speed: { min: 10, max: 40 },
      scale: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitZone: this.createRandomZone(width, height),
    });

    this.frame = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width - 24,
      height - 24,
      0x0f162a,
      0.6
    );
    this.frame.setStrokeStyle(4, 0xffe066, 0.8);
  }

  resize(width: number, height: number): void {
    this.zone.setPosition(width / 2, height / 2);
    this.zone.setSize(width, height);
    this.emitter.setPosition(this.zone.x, this.zone.y);
    this.emitter.setEmitZone(this.createRandomZone(width, height));

    this.frame.setPosition(width / 2, height / 2);
    this.frame.setSize(width - 24, height - 24);
  }

  destroy(): void {
    this.zone?.destroy();
    this.emitter?.destroy();
    this.frame?.destroy();
  }

  private ensureSparkTexture(): void {
    if (this.scene.textures.exists('spark')) {
      return;
    }

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 2, 2);
    graphics.generateTexture('spark', 2, 2);
    graphics.destroy();
  }

  private createRandomZone(width: number, height: number): Phaser.GameObjects.Particles.Zones.RandomZone {
    return new Phaser.GameObjects.Particles.Zones.RandomZone({
      getRandomPoint: (point?: Phaser.Types.Math.Vector2Like) => {
        const target = point ?? { x: 0, y: 0 };
        target.x = Phaser.Math.Between(-width / 2, width / 2);
        target.y = Phaser.Math.Between(-height / 2, height / 2);
        return target;
      },
    });
  }
}
