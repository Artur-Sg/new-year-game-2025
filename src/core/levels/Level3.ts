import { Level, LevelContext, LevelHooks } from './Level';
import { FlyingGiftsLevel } from './FlyingGiftsLevel';

export class Level3 implements Level {
  readonly id = 3;
  private impl: FlyingGiftsLevel;

  constructor(context: LevelContext, hooks: LevelHooks) {
    this.impl = new FlyingGiftsLevel(context, hooks, { id: 3, spawnDelay: 600, giftSpeed: 280 });
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
