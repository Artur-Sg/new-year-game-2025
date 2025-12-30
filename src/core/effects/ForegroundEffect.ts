import Phaser from 'phaser';
import {
  forestForegroundGroundKeys,
  forestForegroundPropKeys,
  forestSlices,
} from '../assets/forestSlices';

export class ForegroundEffect {
  private propItems: Phaser.GameObjects.Image[] = [];
  private groundItems: Phaser.GameObjects.Image[] = [];
  private propShadows: Phaser.GameObjects.Ellipse[] = [];
  private groundBase?: Phaser.GameObjects.Rectangle;
  private propKeys: string[] = [];
  private groundKeys: string[] = [];
  private propY = 0;
  private groundY = 0;
  private groundTop = 0;
  private groundHeight = 0;
  private readonly speed = 80;
  private readonly propGapRange = { min: 10, max: 90 };
  private readonly groundGapRange = { min: 0, max: 30 };
  private readonly houseKeys = ['house-1', 'house-2', 'house-3', 'house-4'];
  private spawnBuffer = 400;
  private readonly propYOffsetRange = { min: 10, max: 80 };
  private readonly groundPrimaryKey = 'ground-snow';
  private readonly groundPrimaryChance = 65;
  private nonHousePropKeys: string[] = [];
  private treeKeys: string[] = [];
  private readonly groundSnapDistance = 140;
  private readonly propShadowDepth = 5.55;

  constructor(private scene: Phaser.Scene) {}

  create(): void {
    this.propKeys = forestForegroundPropKeys.length > 0
      ? [...forestForegroundPropKeys]
      : forestSlices.map((slice) => slice.key);
    this.nonHousePropKeys = this.propKeys.filter((key) => !this.houseKeys.includes(key));
    this.treeKeys = this.propKeys.filter((key) => key.startsWith('tree-') || key === 'average-tree');
    this.groundKeys = forestForegroundGroundKeys.length > 0
      ? [...forestForegroundGroundKeys]
      : ['ground-snow'];
    this.rebuild();
  }

  resize(width: number, height: number): void {
    this.updateGroundMetrics(width, height);
    this.spawnBuffer = Math.max(400, Math.floor(width * 0.6));
    this.reflow(width);
    this.updateGroundBase();
  }

  reset(): void {
    this.rebuild();
  }

  update(delta: number): void {
    const shift = (this.speed * delta) / 1000;
    let rightmostProp = -Infinity;
    let rightmostGround = -Infinity;

    this.propItems.forEach((item, index) => {
      item.x -= shift;
      rightmostProp = Math.max(rightmostProp, item.x + item.displayWidth / 2);
      const shadow = this.propShadows[index];
      if (shadow) {
        this.updateShadowForItem(item, shadow);
      }
    });

    this.groundItems.forEach((item) => {
      item.x -= shift;
      rightmostGround = Math.max(rightmostGround, item.x + item.displayWidth / 2);
    });

    this.propItems.forEach((item, index) => {
      if (item.x + item.displayWidth / 2 < -this.spawnBuffer) {
        const nextGap = this.getGap(this.propGapRange);
        const nextKey = this.pickPropKey();
        item.setTexture(nextKey);
        item.setOrigin(0.5, 1);
        item.setScale(2);
        this.setPropItemPosition(
          item,
          rightmostProp + item.displayWidth / 2 + nextGap
        );
        const shadow = this.propShadows[index];
        if (shadow) {
          this.updateShadowForItem(item, shadow);
        }
        rightmostProp = item.x + item.displayWidth / 2;
      }
    });

    this.groundItems.forEach((item) => {
      if (item.x + item.displayWidth / 2 < -this.spawnBuffer) {
        const nextGap = this.getGap(this.groundGapRange);
        const nextKey = this.pickGroundKey();
        item.setTexture(nextKey);
        item.setOrigin(0.5, 1);
        item.setScale(2);
        item.setDepth(5.5);
        item.setPosition(rightmostGround + item.displayWidth / 2 + nextGap, this.groundY);
        this.alignGroundItem(item);
        rightmostGround = item.x + item.displayWidth / 2;
      }
    });
  }

  destroy(): void {
    this.propItems.forEach((item) => item.destroy());
    this.groundItems.forEach((item) => item.destroy());
    this.propShadows.forEach((shadow) => shadow.destroy());
    this.propItems = [];
    this.groundItems = [];
    this.propShadows = [];
    this.groundBase?.destroy();
    this.groundBase = undefined;
  }

  private rebuild(): void {
    this.propItems.forEach((item) => item.destroy());
    this.groundItems.forEach((item) => item.destroy());
    this.propShadows.forEach((shadow) => shadow.destroy());
    this.propItems = [];
    this.groundItems = [];
    this.propShadows = [];
    this.updateGroundMetrics(this.scene.scale.width, this.scene.scale.height);
    this.spawnBuffer = Math.max(400, Math.floor(this.scene.scale.width * 0.6));

    let x = -this.spawnBuffer;
    const width = this.scene.scale.width;
    this.createGroundBase();
    while (x < width + this.spawnBuffer) {
      const key = this.pickPropKey();
      const item = this.scene.add.image(x, this.propY, key);
      item.setOrigin(0.5, 1);
      item.setScale(2);
      item.setDepth(6);
      this.propItems.push(item);
      const shadow = this.createShadow(this.propShadowDepth);
      this.propShadows.push(shadow);
      this.setPropItemPosition(item, x);
      this.updateShadowForItem(item, shadow);
      x += item.displayWidth + this.getGap(this.propGapRange);
    }

    x = -this.spawnBuffer;
    while (x < width + this.spawnBuffer) {
      const key = this.pickGroundKey();
      const item = this.scene.add.image(x, this.groundY, key);
      item.setOrigin(0.5, 1);
      item.setScale(2);
      item.setDepth(5.5);
      this.groundItems.push(item);
      x += item.displayWidth + this.getGap(this.groundGapRange);
    }

    this.alignGroundWithProps();
  }

  private reflow(width: number): void {
    let x = -this.spawnBuffer;
    this.propItems.forEach((item, index) => {
      this.setPropItemPosition(item, x);
      const shadow = this.propShadows[index] ?? this.createShadow(this.propShadowDepth);
      this.propShadows[index] = shadow;
      this.updateShadowForItem(item, shadow);
      x += item.displayWidth + this.getGap(this.propGapRange);
    });

    while (x < width + this.spawnBuffer) {
      const key = this.pickPropKey();
      const item = this.scene.add.image(x, this.propY, key);
      item.setOrigin(0.5, 1);
      item.setScale(2);
      item.setDepth(6);
      this.propItems.push(item);
      const shadow = this.createShadow(this.propShadowDepth);
      this.propShadows.push(shadow);
      this.setPropItemPosition(item, x);
      this.updateShadowForItem(item, shadow);
      x += item.displayWidth + this.getGap(this.propGapRange);
    }

    x = -this.spawnBuffer;
    this.groundItems.forEach((item) => {
      item.setPosition(x, this.groundY);
      x += item.displayWidth + this.getGap(this.groundGapRange);
    });

    while (x < width + this.spawnBuffer) {
      const key = this.pickGroundKey();
      const item = this.scene.add.image(x, this.groundY, key);
      item.setOrigin(0.5, 1);
      item.setScale(2);
      item.setDepth(5.5);
      this.groundItems.push(item);
      x += item.displayWidth + this.getGap(this.groundGapRange);
    }

    this.updateGroundBase();
    this.alignGroundWithProps();
  }

  private pickKey(keys: string[]): string {
    if (keys.length === 0) {
      return 'tree-1';
    }
    const index = Phaser.Math.Between(0, keys.length - 1);
    return keys[index];
  }

  private pickPropKey(): string {
    if (this.propKeys.length === 0) {
      return 'tree-1';
    }
    if (Phaser.Math.Between(0, 99) < 20) {
      const index = Phaser.Math.Between(0, this.houseKeys.length - 1);
      return this.houseKeys[index];
    }
    if (this.treeKeys.length > 0 && Phaser.Math.Between(0, 99) < 60) {
      return this.pickKey(this.treeKeys);
    }
    if (this.nonHousePropKeys.length > 0) {
      return this.pickKey(this.nonHousePropKeys);
    }
    return this.pickKey(this.propKeys);
  }

  private pickGroundKey(): string {
    if (this.groundKeys.length === 0) {
      return this.groundPrimaryKey;
    }
    if (Phaser.Math.Between(0, 99) < this.groundPrimaryChance) {
      return this.groundPrimaryKey;
    }
    return this.pickKey(this.groundKeys);
  }

  private getGap(range: { min: number; max: number }): number {
    return Phaser.Math.Between(range.min, range.max);
  }

  private setPropItemPosition(item: Phaser.GameObjects.Image, x: number): void {
    const offset = Phaser.Math.Between(this.propYOffsetRange.min, this.propYOffsetRange.max);
    item.setPosition(x, this.propY + offset);
  }

  private createShadow(depth: number): Phaser.GameObjects.Ellipse {
    const shadow = this.scene.add.ellipse(0, 0, 10, 4, 0x000000, 0.25);
    shadow.setOrigin(0.5, 0.5);
    shadow.setDepth(depth);
    return shadow;
  }

  private updateShadowForItem(item: Phaser.GameObjects.Image, shadow: Phaser.GameObjects.Ellipse): void {
    const width = Phaser.Math.Clamp(item.displayWidth * 0.6, 24, 200);
    const height = Phaser.Math.Clamp(item.displayHeight * 0.08, 4, 18);
    shadow.setSize(width, height);
    shadow.setPosition(item.x, item.y - height * 0.4);
  }

  private alignGroundWithProps(): void {
    if (this.propItems.length === 0 || this.groundItems.length === 0) {
      return;
    }

    this.groundItems.forEach((ground) => {
      let closest: Phaser.GameObjects.Image | undefined;
      let minDistance = this.groundSnapDistance + 1;

      this.propItems.forEach((prop) => {
        const distance = Math.abs(prop.x - ground.x);
        if (distance < minDistance) {
          minDistance = distance;
          closest = prop;
        }
      });

      if (closest && minDistance <= this.groundSnapDistance) {
        ground.setY(closest.y);
      } else {
        ground.setY(this.groundY);
      }
    });
  }

  private alignGroundItem(ground: Phaser.GameObjects.Image): void {
    let closest: Phaser.GameObjects.Image | undefined;
    let minDistance = this.groundSnapDistance + 1;

    this.propItems.forEach((prop) => {
      const distance = Math.abs(prop.x - ground.x);
      if (distance < minDistance) {
        minDistance = distance;
        closest = prop;
      }
    });

    if (closest && minDistance <= this.groundSnapDistance) {
      ground.setY(closest.y);
    } else {
      ground.setY(this.groundY);
    }
  }

  private updateGroundMetrics(width: number, height: number): void {
    this.groundHeight = Math.max(120, height * 0.22);
    this.groundTop = height - this.groundHeight;
    this.groundY = this.groundTop + 13;
    this.propY = this.groundTop + 6;
  }

  private createGroundBase(): void {
    if (!this.groundBase) {
      this.groundBase = this.scene.add.rectangle(0, 0, 10, 10, 0xffffff, 1);
      this.groundBase.setOrigin(0, 0);
      this.groundBase.setDepth(5);
    }
    this.updateGroundBase();
  }

  private updateGroundBase(): void {
    if (!this.groundBase) {
      return;
    }
    this.groundBase.setPosition(0, this.groundTop);
    this.groundBase.setSize(this.scene.scale.width, this.groundHeight);
  }
}
