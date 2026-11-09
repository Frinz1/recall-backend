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

// Test 5: 4th consecutive Good graduates regardless of ease factor
const t5 = SM2Service.calculate('good', 3, 14, 1.9);
assert(t5.masteryStatus === 'mastered', '4th consecutive Good should graduate to mastered');

// Test 6: Hard never graduates
const t6 = SM2Service.calculate('hard', 3, 14, 2.5);
assert(t6.masteryStatus === 'reviewing', 'Hard rating must not graduate to mastered');

// Test 7: 180-day interval cap
const t7 = SM2Service.calculate('easy', 10, 1256, 2.4);
assert(t7.intervalDays === 180, 'Interval must be capped at 180 days');

console.log('✅ All Backend SM-2 tests passed successfully!');
