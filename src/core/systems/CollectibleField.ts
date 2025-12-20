import Phaser from 'phaser';

export type CollectibleObject = Phaser.GameObjects.Rectangle & {
  body: Phaser.Physics.Arcade.StaticBody;
};

export class CollectibleField {
  private group: Phaser.Physics.Arcade.StaticGroup;
  private readonly palette = [0xff5b6c, 0x5bd1ff, 0x7cff75, 0xffd86c];

  constructor(private scene: Phaser.Scene, private bounds: Phaser.Geom.Rectangle) {
    this.group = this.scene.physics.add.staticGroup();
  }

  spawn(count: number): void {
    for (let i = 0; i < count; i += 1) {
      const point = this.randomPoint();
      const color = Phaser.Utils.Array.GetRandom(this.palette);
      const rectangle = this.scene.add.rectangle(point.x, point.y, 16, 16, color, 0.9) as CollectibleObject;
      rectangle.setStrokeStyle(2, 0xffffff, 0.7);

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
