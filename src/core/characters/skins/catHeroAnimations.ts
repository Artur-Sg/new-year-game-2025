import Phaser from 'phaser';

export function registerCatHeroAnimations(anims: Phaser.Animations.AnimationManager): void {
  if (anims.exists('cat-idle')) {
    return;
  }

  const columns = 10;
  anims.create({
    key: 'cat-idle',
    frames: anims.generateFrameNumbers('cat-hero', { start: 0, end: 9 }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: 'cat-forward',
    frames: anims.generateFrameNumbers('cat-hero', { start: columns, end: columns + 1 }),
    frameRate: 8,
    repeat: -1,
  });
  anims.create({
    key: 'cat-backward',
    frames: anims.generateFrameNumbers('cat-hero', { start: columns * 2, end: columns * 2 + 2 }),
    frameRate: 8,
    repeat: -1,
  });
  anims.create({
    key: 'cat-down',
    frames: anims.generateFrameNumbers('cat-hero', { start: columns * 3, end: columns * 3 + 3 }),
    frameRate: 8,
    repeat: -1,
  });
  anims.create({
    key: 'cat-up',
    frames: anims.generateFrameNumbers('cat-hero', { start: columns * 4, end: columns * 4 + 2 }),
    frameRate: 8,
    repeat: -1,
  });
}
