export const GameEvents = {
  READY: 'game-ready',
  START: 'game-start',
  SCORE_UPDATED: 'score-updated',
  TIMER_UPDATED: 'timer-updated',
  LEVEL_COMPLETED: 'level-completed',
  LEVEL_NEXT: 'level-next',
  GAME_OVER: 'game-over',
} as const;

export type GameEventKey = (typeof GameEvents)[keyof typeof GameEvents];
