export type RecallRating = 'again' | 'hard' | 'good' | 'easy';

export interface SM2Result {
  nextReviewDate: Date;
  intervalDays: number;
  repetitions: number;
  easeFactor: number;
  masteryStatus: 'learning' | 'reviewing' | 'mastered';
}

export class SM2Service {
  private static readonly MIN_EASE_FACTOR = 1.3;

  /**
   * Calculates the next review date and ease factor according to SuperMemo-2.
   */
  public static calculate(
    rating: RecallRating,
    currentRepetitions: number,
    currentIntervalDays: number,
    currentEaseFactor: number,
    referenceDate?: Date
  ): SM2Result {
    const now = referenceDate || new Date();

    // Map rating string to numeric quality q (1-5)
    let q = 4;
    switch (rating) {
      case 'again':
        q = 1;
        break;
      case 'hard':
        q = 3;
        break;
      case 'good':
        q = 4;
        break;
      case 'easy':
        q = 5;
        break;
    }

    // 1. Calculate new Ease Factor
    // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    let newEaseFactor = currentEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (newEaseFactor < this.MIN_EASE_FACTOR) {
      newEaseFactor = this.MIN_EASE_FACTOR;
    }

    let nextRepetitions: number;
    let nextIntervalDays: number;
    let nextStatus: 'learning' | 'reviewing' | 'mastered';

    if (q < 3) {
      // Failed recall: reset repetitions to 0, card must be reviewed again tomorrow
      nextRepetitions = 0;
      nextIntervalDays = 1;
      nextStatus = 'learning';
    } else {
      // Successful recall
      if (currentRepetitions === 0) {
        nextIntervalDays = 1;
      } else if (currentRepetitions === 1) {
        nextIntervalDays = 6;
      } else {
        nextIntervalDays = Math.round(currentIntervalDays * newEaseFactor);
      }

      nextRepetitions = currentRepetitions + 1;

      if (nextRepetitions >= 4 && newEaseFactor >= 2.3) {
        nextStatus = 'mastered';
      } else {
        nextStatus = 'reviewing';
      }
    }

    const nextReviewDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

    return {
      nextReviewDate,
      intervalDays: nextIntervalDays,
      repetitions: nextRepetitions,
      easeFactor: Number(newEaseFactor.toFixed(2)),
      masteryStatus: nextStatus,
    };
  }
}
