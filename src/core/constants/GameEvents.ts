export const GameEvents = {
  READY: 'game-ready',
  START: 'game-start',
  SCORE_UPDATED: 'score-updated',
  TIMER_UPDATED: 'timer-updated',
  GAME_OVER: 'game-over',
} as const;

export type GameEventKey = (typeof GameEvents)[keyof typeof GameEvents];
