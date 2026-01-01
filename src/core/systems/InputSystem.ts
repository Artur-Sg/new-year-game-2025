import Phaser from 'phaser';

export class InputSystem {
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys: Record<string, Phaser.Input.Keyboard.Key>;
  private player?: Phaser.GameObjects.Components.Transform;
  private readonly touchDeadZone = 12;
  private touchDirection = new Phaser.Math.Vector2(0, 0);
  private touchActive = false;
  private touchPointerId?: number;

  constructor(private scene: Phaser.Scene, player?: Phaser.GameObjects.Components.Transform) {
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasdKeys = scene.input.keyboard!.addKeys(
      'W,A,S,D'
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.player = player;

    this.scene.input.addPointer(1);
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.input.off('pointerdown', this.handlePointerDown, this);
      this.scene.input.off('pointermove', this.handlePointerMove, this);
      this.scene.input.off('pointerup', this.handlePointerUp, this);
    });
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

    if (direction.lengthSq() > 0) {
      return direction;
    }

    if (this.touchActive) {
      return direction.copy(this.touchDirection);
    }

    return direction;
  }

  getPointerWorldPosition(): Phaser.Math.Vector2 {
    const pointer = this.scene.input.activePointer;
    const { x, y } = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    return new Phaser.Math.Vector2(x, y);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.player || !pointer.isDown) {
      return;
    }
    this.touchActive = true;
    this.touchPointerId = pointer.id;
    this.updateTouchDirection(pointer);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.touchActive || !this.player || !pointer.isDown) {
      return;
    }
    if (this.touchPointerId !== undefined && pointer.id !== this.touchPointerId) {
      return;
    }
    this.updateTouchDirection(pointer);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (this.touchPointerId !== undefined && pointer.id !== this.touchPointerId) {
      return;
    }
    this.touchActive = false;
    this.touchPointerId = undefined;
    this.touchDirection.set(0, 0);
  }

  private updateTouchDirection(pointer: Phaser.Input.Pointer): void {
    if (!this.player) {
      return;
    }
    const { x, y } = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const vector = new Phaser.Math.Vector2(x - this.player.x, y - this.player.y);
    if (vector.length() < this.touchDeadZone) {
      this.touchDirection.set(0, 0);
      return;
    }
    this.touchDirection.copy(vector.normalize());
  }
}
