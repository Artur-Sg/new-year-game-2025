import { Level, LevelContext, LevelHooks } from './Level';
import { FlyingGiftsLevel } from './FlyingGiftsLevel';

export class Level2 implements Level {
  readonly id = 2;
  private impl: FlyingGiftsLevel;

  constructor(context: LevelContext, hooks: LevelHooks) {
    this.impl = new FlyingGiftsLevel(context, hooks, { id: 2, spawnDelay: 700, giftSpeed: 220 });
  }

  start(): void {
    this.impl.start();
  }

  update(): void {
    this.impl.update();
  }

  resize(width: number, height: number): void {
    this.impl.resize(width, height);
  }

  destroy(): void {
    this.impl.destroy();
  }
}
