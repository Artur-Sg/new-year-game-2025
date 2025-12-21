import Phaser from 'phaser';

export function registerXmascatAnimations(anims: Phaser.Animations.AnimationManager): void {
  if (anims.exists('xmascat-fly')) {
    return;
  }

  anims.create({
    key: 'xmascat-fly',
    frames: anims.generateFrameNumbers('xmascat', { start: 0, end: 11 }),
    frameRate: 10,
    repeat: -1,
  });
}
