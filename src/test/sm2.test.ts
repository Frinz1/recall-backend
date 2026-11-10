import { SM2Service } from '../services/sm2.service';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

console.log('🧪 Testing Backend SM-2 Engine...');

// Test 1: First Good review
const t1 = SM2Service.calculate('good', 0, 0, 2.5);
assert(t1.intervalDays === 1, 'Initial good review should have 1-day interval');
assert(t1.repetitions === 1, 'Repetitions should be 1');
assert(t1.masteryStatus === 'reviewing', 'Status should be reviewing');

// Test 2: Second Good review
const t2 = SM2Service.calculate('good', 1, 1, 2.5);
assert(t2.intervalDays === 6, 'Second review should have 6-day interval');
assert(t2.repetitions === 2, 'Repetitions should be 2');

// Test 3: Failed review (Again)
const t3 = SM2Service.calculate('again', 4, 15, 2.4);
assert(t3.intervalDays === 1, 'Failed review resets interval to 1');
assert(t3.repetitions === 0, 'Failed review resets repetitions to 0');
assert(t3.masteryStatus === 'learning', 'Status should reset to learning');
assert(t3.easeFactor < 2.4, 'Ease factor should drop');

// Test 4: Ease factor floor
let ef = 1.35;
for (let i = 0; i < 5; i++) {
  const r = SM2Service.calculate('again', 0, 1, ef);
  ef = r.easeFactor;
}
assert(ef >= 1.3, 'Ease factor must not drop below 1.3');

// Test 5: 4th consecutive Good with high EF and long interval graduates to mastered
// reps=3, interval=14, EF=2.5 → newEF=2.5, nextInterval=round(14*2.5)=35 >= 21 → mastered ✅
const t5 = SM2Service.calculate('good', 3, 14, 2.5);
assert(t5.masteryStatus === 'mastered', '4th consecutive Good (EF=2.5, interval=35d) should graduate to mastered');
assert(t5.intervalDays >= 21, 'Graduating interval must be at least 21 days');
assert(t5.easeFactor >= 2.0, 'Graduating EF must be at least 2.0');

// Test 6: Hard never graduates, even at high EF and long interval
const t6 = SM2Service.calculate('hard', 3, 14, 2.5);
assert(t6.masteryStatus === 'reviewing', 'Hard rating must not graduate to mastered');

// Test 7: 180-day interval cap
const t7 = SM2Service.calculate('easy', 10, 1256, 2.4);
assert(t7.intervalDays === 180, 'Interval must be capped at 180 days');

// Test 8: EF < 2.0 blocks mastery — struggle card cannot graduate even with 4+ reps
// reps=3, interval=14, EF=1.9 → newEF=1.9 (< 2.0 gate fails) → NOT mastered
const t8 = SM2Service.calculate('good', 3, 14, 1.9);
assert(t8.masteryStatus === 'reviewing', 'Card with EF < 2.0 must NOT graduate to mastered');
assert(t8.repetitions === 4, 'Repetition counter should still increment');

// Test 9: Interval < 21 days blocks mastery — card hasn't proven long-term retention
// reps=3, interval=5, EF=2.5 → nextInterval=round(5*2.5)=13 days < 21 → NOT mastered
const t9 = SM2Service.calculate('good', 3, 5, 2.5);
assert(t9.masteryStatus === 'reviewing', 'Card with next interval < 21 days must NOT graduate to mastered');

// Test 10: Easy rating with high EF and long interval graduates correctly
// reps=3, interval=14, EF=2.5 → newEF=2.6, nextInterval=round(14*2.6)=36 → mastered ✅
const t10 = SM2Service.calculate('easy', 3, 14, 2.5);
assert(t10.masteryStatus === 'mastered', 'Easy rating with EF=2.6, interval=36d should graduate to mastered');

// Test 11: Mastery reverts correctly when card is failed (again)
const t11 = SM2Service.calculate('again', 4, 30, 2.5);
assert(t11.masteryStatus === 'learning', 'Failed mastered card must reset to learning');
assert(t11.repetitions === 0, 'Repetitions must reset to 0 on fail');
assert(t11.intervalDays === 1, 'Interval must reset to 1 on fail');

console.log('✅ All Backend SM-2 tests passed successfully!');
