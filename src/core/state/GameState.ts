export class GameState {
  private score = 0;
  private startTime = 0;
  private elapsed = 0;
  private lives = 0;

  start(): void {
    this.score = 0;
    this.elapsed = 0;
    this.startTime = performance.now();
  }

  addScore(amount: number): number {
    this.score += amount;
    return this.score;
  }

  setLives(count: number): void {
    this.lives = Math.max(0, count);
  }

  loseLife(): number {
    this.lives = Math.max(0, this.lives - 1);
    return this.lives;
  }

  getLives(): number {
    return this.lives;
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
