import Phaser from 'phaser';

export type CollectibleObject = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.StaticBody;
};

export class CollectibleField {
  private group: Phaser.Physics.Arcade.StaticGroup;

  constructor(private scene: Phaser.Scene, private bounds: Phaser.Geom.Rectangle) {
    this.group = this.scene.physics.add.staticGroup();
  }

  spawn(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const point = this.randomPoint();
      const color = Phaser.Display.Color.RandomRGB(150, 255).color;
      const rectangle = this.scene.add.rectangle(point.x, point.y, 16, 16, color, 0.9) as CollectibleObject;
      rectangle.setStrokeStyle(1, 0xffffff, 0.6);

      this.scene.physics.add.existing(rectangle, true);
      this.group.add(rectangle);
    }
  }

  bindToTarget(
    target: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    onCollected: () => void
  ): void {
    this.scene.physics.add.overlap(target, this.group, (_target, object) => {
      const rectangle = object as CollectibleObject;
      rectangle.destroy();
      onCollected();

      if (this.group.countActive(true) < 8) {
        this.spawn(4);
      }
    });
  }

  clear(): void {
    this.group.clear(true, true);
  }

  setBounds(bounds: Phaser.Geom.Rectangle): void {
    this.bounds = bounds;
  }

  private randomPoint(): Phaser.Math.Vector2 {
    const x = Phaser.Math.Between(this.bounds.left, this.bounds.right);
    const y = Phaser.Math.Between(this.bounds.top, this.bounds.bottom);
    return new Phaser.Math.Vector2(x, y);
  }
}
