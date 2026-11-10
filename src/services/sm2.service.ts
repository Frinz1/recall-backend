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
  private static readonly MAX_INTERVAL_DAYS = 180; // 6-month semester ceiling

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
      // Failed recall: reset repetitions streak to 0, card returns to learning
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
        const rawInterval = Math.round(currentIntervalDays * newEaseFactor);
        nextIntervalDays = Math.min(this.MAX_INTERVAL_DAYS, Math.max(1, rawInterval));
      }

      if (nextIntervalDays > this.MAX_INTERVAL_DAYS) {
        nextIntervalDays = this.MAX_INTERVAL_DAYS;
      }

      nextRepetitions = currentRepetitions + 1;

      // Mastery Gate — all three conditions must be true:
      //   1. 4+ consecutive successful reviews (streak proves consistency)
      //   2. EF >= 2.0 (card is no longer a struggle card — EF < 2.0 means user still forgets too much)
      //   3. Interval >= 21 days (proven long-term retention — user recalled after 3+ weeks)
      //   "Hard" is excluded: struggling but passing is not mastery.
      const isTrulyMastered =
        nextRepetitions >= 4 &&
        rating !== 'hard' &&
        newEaseFactor >= 2.0 &&
        nextIntervalDays >= 21;

      nextStatus = isTrulyMastered ? 'mastered' : 'reviewing';
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
