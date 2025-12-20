import Phaser from 'phaser';

export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(private scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasdKeys = scene.input.keyboard!.addKeys(
      'W,A,S,D'
    ) as Record<string, Phaser.Input.Keyboard.Key>;
  }

  getDirectionVector(): Phaser.Math.Vector2 {
    const direction = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      direction.x -= 1;
    }
    if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      direction.x += 1;
    }
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      direction.y -= 1;
    }
    if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      direction.y += 1;
    }

    return direction;
  }

  getPointerWorldPosition(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    const { x, y } = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return new Phaser.Math.Vector2(x, y);
  }
}
