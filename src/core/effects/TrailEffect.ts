import Phaser from 'phaser';
import { PlayerSkin } from '../config/playerSkins';

type TrailSprite = Phaser.GameObjects.GameObject &
  Phaser.GameObjects.Components.Transform &
  Phaser.GameObjects.Components.Size;

export class TrailEffect {
  private trails: Array<{
    emitter: Phaser.GameObjects.Particles.ParticleEmitter;
    sideOffset: number;
  }> = [];
  private trailActive = false;
  private direction = new Phaser.Math.Vector2(1, 0);
  private jitter = new Phaser.Math.Vector2(0, 0);
  private jitterTarget = new Phaser.Math.Vector2(0, 0);
  private lastJitterAt = 0;
  private lastSnowEmitAt = 0;
  private isSnow = false;
  private sprite?: TrailSprite;

  constructor(private scene: Phaser.Scene) {}

  create(sprite: TrailSprite, skin: PlayerSkin): void {
    this.sprite = sprite;
    this.isSnow = skin === 'cat-hero';
    if (this.isSnow) {
      this.ensureSnowStarTexture();
    } else {
      this.ensureRainbowTexture();
    }

    this.trails.forEach((trail) => trail.emitter.destroy());
    this.trails = [];

    const colors = this.isSnow
      ? [0xffffff, 0xffffff, 0xffffff, 0xffffff]
      : [0xff3b3b, 0xff9f1a, 0xffe600, 0x3bff5b, 0x2fd1ff, 0x5f6bff, 0xb36bff];
    const stripeGap = this.isSnow
      ? Math.max(3, sprite.displayHeight * 0.1)
      : Math.max(4, sprite.displayHeight * 0.08);
    const offsets = colors.map((_, index) => (index - (colors.length - 1) / 2) * stripeGap);
    const textureKey = this.isSnow ? 'snow-star' : 'rainbow-pixel';

    this.trails = colors.map((color, index) => {
      const emitter = this.scene.add.particles(0, 0, textureKey, {
        lifespan: this.isSnow ? { min: 900, max: 1500 } : { min: 900, max: 1400 },
        alpha: this.isSnow
          ? {
              onEmit: (particle) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowAlpha?: number };
                p.snowAlpha = Phaser.Math.FloatBetween(0.35, 0.8);
                return p.snowAlpha;
              },
              onUpdate: (particle, _key, t, value) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowAlpha?: number };
                const base = p.snowAlpha ?? value;
                return base * (1 - t);
              },
            }
          : { start: 0.9, end: 0 },
        scaleX: this.isSnow
          ? {
              onEmit: (particle) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                if (p.snowScale === undefined) {
                  p.snowScale = Phaser.Math.FloatBetween(0.4, 1.6);
                }
                return p.snowScale;
              },
              onUpdate: (particle, _key, t, value) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                const base = p.snowScale ?? value;
                return base * (1 - t);
              },
            }
          : undefined,
        scaleY: this.isSnow
          ? {
              onEmit: (particle) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                if (p.snowScale === undefined) {
                  p.snowScale = Phaser.Math.FloatBetween(0.4, 1.6);
                }
                return p.snowScale;
              },
              onUpdate: (particle, _key, t, value) => {
                const p = particle as Phaser.GameObjects.Particles.Particle & { snowScale?: number };
                const base = p.snowScale ?? value;
                return base * (1 - t);
              },
            }
          : undefined,
        scale: this.isSnow ? undefined : { start: 1, end: 0.2 },
        quantity: this.isSnow ? 2 : 1,
        frequency: this.isSnow ? 45 : 10,
        delay: this.isSnow ? { min: 0, max: 220 } : 0,
        tint: color,
        blendMode: 'NORMAL',
        radial: false,
      });
      emitter.setDepth(11);
      emitter.tintFill = true;
      emitter.emitting = false;
      emitter.setVisible(false);
      return { emitter, sideOffset: offsets[index] };
    });
    this.trailActive = false;
  }

  update(direction: Phaser.Math.Vector2): void {
    if (!this.sprite || this.trails.length === 0) {
      return;
    }

    const moving = direction.lengthSq() > 0;
    if (this.trailActive !== moving) {
      this.trailActive = moving;
      this.trails.forEach((trail) => {
        trail.emitter.emitting = moving && !this.isSnow;
        trail.emitter.setVisible(moving);
      });
    }

    if (!moving) {
      return;
    }

    const nextDir = direction.clone().normalize();
    const dot = this.direction.dot(nextDir);
    if (dot < -0.4) {
      this.direction.copy(nextDir);
    } else {
      this.direction.lerp(nextDir, 0.25);
      this.direction.normalize();
    }

    const sprite = this.sprite;
    const back = this.direction.clone().scale(-sprite.displayWidth * 0.12);
    const side = new Phaser.Math.Vector2(-this.direction.y, this.direction.x);
    const baseSpeed = 140;
    const trailSpeed = this.direction.clone().scale(-baseSpeed);

    if (!this.isSnow) {
      const now = this.scene.time.now;
      if (now - this.lastJitterAt > 120) {
        this.lastJitterAt = now;
        this.jitterTarget.set(Phaser.Math.Between(-2, 2), Phaser.Math.Between(-2, 2));
      }
      this.jitter.lerp(this.jitterTarget, 0.1);
    } else {
      this.jitter.set(0, 0);
      this.jitterTarget.set(0, 0);
    }

    if (this.isSnow) {
      const now = this.scene.time.now;
      if (now - this.lastSnowEmitAt < 70) {
        return;
      }
      this.lastSnowEmitAt = now;
      this.trails.forEach((trail) => {
        const startOffset = Phaser.Math.Between(
          Math.floor(-sprite.displayHeight * 0.25),
          Math.floor(sprite.displayHeight * 0.25)
        );
        const x = sprite.x + back.x + side.x * (trail.sideOffset + startOffset);
        const y = sprite.y + back.y + side.y * (trail.sideOffset + startOffset);
        trail.emitter.speedX = trailSpeed.x;
        trail.emitter.speedY = trailSpeed.y;
        trail.emitter.emitParticleAt(x, y, 1);
      });
      return;
    }

    this.trails.forEach((trail) => {
      const x = sprite.x + back.x + side.x * trail.sideOffset + this.jitter.x;
      const y = sprite.y + back.y + side.y * trail.sideOffset + this.jitter.y;
      trail.emitter.setPosition(x, y);
      trail.emitter.speedX = trailSpeed.x;
      trail.emitter.speedY = trailSpeed.y;
    });
  }

  destroy(): void {
    this.trails.forEach((trail) => trail.emitter.destroy());
    this.trails = [];
  }

  private ensureSnowStarTexture(): void {
    if (this.scene.textures.exists('snow-star')) {
      return;
    }

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 3);
    graphics.fillRect(3, 0, 2, 8);
    graphics.fillRect(0, 3, 8, 2);
    graphics.generateTexture('snow-star', 8, 8);
    graphics.destroy();
  }

  private ensureRainbowTexture(): void {
    if (this.scene.textures.exists('rainbow-pixel')) {
      return;
    }

    const graphics = this.scene.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillRect(0, 0, 12, 4);
    graphics.generateTexture('rainbow-pixel', 12, 4);
    graphics.destroy();
  }
}
