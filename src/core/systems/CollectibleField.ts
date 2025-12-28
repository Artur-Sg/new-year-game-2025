import Phaser from 'phaser';

export type CollectibleObject = Phaser.GameObjects.Image & {
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
      const key = Phaser.Utils.Array.GetRandom(['gift-1', 'gift-2', 'gift-3', 'gift-4', 'gift-5', 'gift-6', 'gift-7']);
      const sprite = this.scene.add.image(point.x, point.y, key) as CollectibleObject;
      sprite.setOrigin(0.5, 0.5);
      sprite.setScale(0.13);
      sprite.setDepth(11);

      this.scene.physics.add.existing(sprite, true);
      this.group.add(sprite);
    }
  }

  bindToTarget(
    target: Phaser.Types.Physics.Arcade.GameObjectWithBody,
    onCollected: () => void
  ): void {
    this.scene.physics.add.overlap(target, this.group, (_target, object) => {
      const sprite = object as CollectibleObject;
      sprite.destroy();
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
