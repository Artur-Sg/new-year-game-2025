export class GameState {
  private score = 0;
  private startTime = 0;
  private elapsed = 0;

  start(): void {
    this.score = 0;
    this.elapsed = 0;
    this.startTime = performance.now();
  }

  addScore(amount: number): number {
    this.score += amount;
    return this.score;
  }

  updateTime(): number {
    if (this.startTime > 0) {
      this.elapsed = performance.now() - this.startTime;
    }

    return this.elapsed;
  }

  getScore(): number {
    return this.score;
  }

  getElapsedSeconds(): number {
    return Math.floor(this.elapsed / 1000);
  }
}
