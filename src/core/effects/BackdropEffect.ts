import Phaser from 'phaser';

export class BackdropEffect {
  private layers: Array<{
    sprites: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
    speed: number;
  }> = [];
  private baseSpeed = 55;

  constructor(private scene: Phaser.Scene) {}

  create(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const layerConfigs = [
      { key: 'forest-bg-5', speed: 0.12, depth: -12 },
      { key: 'forest-bg-4', speed: 0.22, depth: -11 },
      { key: 'forest-bg-3', speed: 0.36, depth: -10 },
      { key: 'forest-bg-2', speed: 0.5, depth: -9 },
    ];

    this.layers = layerConfigs.map((config) => {
      const spriteA = this.scene.add.image(0, height / 2, config.key);
      const spriteB = this.scene.add.image(0, height / 2, config.key);
      spriteA.setDepth(config.depth);
      spriteB.setDepth(config.depth);
      this.fitLayerToScreen([spriteA, spriteB], width, height);
      return { sprites: [spriteA, spriteB], speed: config.speed };
    });
  }

  resize(width: number, height: number): void {
    this.layers.forEach(({ sprites }) => {
      this.fitLayerToScreen(sprites, width, height);
    });
  }

  destroy(): void {
    this.layers.forEach(({ sprites }) => sprites.forEach((sprite) => sprite.destroy()));
    this.layers = [];
  }

  update(delta: number, _direction: Phaser.Math.Vector2): void {
    const deltaSeconds = delta / 1000;
    this.layers.forEach(({ sprites, speed }) => {
      const shift = this.baseSpeed * speed * deltaSeconds;
      const [spriteA, spriteB] = sprites;
      spriteA.x -= shift;
      spriteB.x -= shift;

      if (spriteA.x + spriteA.displayWidth <= 0) {
        spriteA.x = spriteB.x + spriteB.displayWidth;
      }
      if (spriteB.x + spriteB.displayWidth <= 0) {
        spriteB.x = spriteA.x + spriteA.displayWidth;
      }
    });
  }

  private fitLayerToScreen(
    sprites: [Phaser.GameObjects.Image, Phaser.GameObjects.Image],
    width: number,
    height: number
  ): void {
    const textureKey = sprites[0].texture.key;
    const source = this.scene.textures.get(textureKey).getSourceImage() as { width: number; height: number };
    const scaleX = width / source.width;
    const scaleY = height / source.height;
    const scale = Math.max(scaleX, scaleY);
    sprites.forEach((sprite) => {
      sprite.setScale(scale);
      sprite.setOrigin(0, 0.5);
      sprite.setY(height / 2);
    });
    const scaledWidth = source.width * scale;
    sprites[0].setX(0);
    sprites[1].setX(scaledWidth);
  }
}
