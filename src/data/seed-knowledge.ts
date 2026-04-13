import type { KnowledgeEntry } from '@/db'

/**
 * Pre-parsed knowledge entries from the coaching system prompt.
 * Imported on first Coach visit to seed the knowledge base.
 */

function entry(category: string, title: string, content: string): Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'> {
  return { category, title, content }
}

export const SEED_KNOWLEDGE: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // --- Profile ---
  entry('profile', 'Identity & Lifestyle', `Software architect, lives in San Francisco's Outer Sunset neighborhood.
Commutes to Burlingame office Tuesdays and Wednesdays (~45 min drive each way).
Works from home Monday, Thursday, Friday.
Work starts at 9 AM, occasional 9 AM meetings.
Evening work block 8:00-9:30 PM most nights. Recurring 8:30 PM call on Mondays.
Weight: 190 lbs (~86 kg).`),

  entry('profile', 'Diet & Nutrition Preferences', `Vegetarian (eats eggs and dairy). Excellent, diverse cook — Asian, Mediterranean, Indian, Mexican, Jamaican cuisines. Tofu is a staple protein, especially super-firm.
Does not eat within ~1 hour of waking — natural pattern, not a problem to fix.
Protein target: ~120g/day (1.4-1.6g/kg).
Greek yogurt (full-fat or 2%, big serving) with granola as grab-and-go breakfast. Hard-boiled eggs prepped Sunday are a weekly staple.
Does not need meal plans or recipes — just needs to hit protein target. Don't prescribe meals unless asked.`),

  entry('profile', 'Training Background & Equipment', `Comfortable running ~8 miles currently. Has lifting experience including barbell work, Olympic lifts (power cleans, snatches), knows proper form for compound movements.
Away from regular lifting for years — muscle memory intact but connective tissue still adapting.
Currently in early weeks of a 38-week marathon training plan.
Shoes: Altra Provisions and Altra Torin 8 (zero-drop, wide toe box).
Equipment: Concept 2 RowErg at home, foam roller, Perform Better mini band set (4-pack), yoga mat, ab wheel, lacrosse ball.
Gym: fitLOCALfit, 3738 Irving St, Outer Sunset. Apple Watch Ultra (1st gen) for HR tracking.`),

  entry('profile', 'Tendencies as a Trainee', `MOST DANGEROUS PATTERN: When he feels good on a run, he pushes past prescribed distance. Be firm about distance caps, especially long runs.
Runs easy days too fast — naturally runs moderate effort rather than conversational pace. Remind about Zone 2 regularly.
Wants to understand the "why" behind everything — explain reasoning, evidence, biomechanics.
Has lifting knowledge — don't over-explain exercises he knows. Ask before coaching form.
Tends to skip Friday gym sessions. If Strength A is missed, don't try to make it up.
Sleep schedule historically inconsistent — evening work blocks and caffeine timing are main threats.
Recovers slower than expected from novel stimuli — first RDL session caused 3+ days of significant DOMS. Scale new exercises conservatively.`),

  // --- Clinical ---
  entry('clinical', 'IT Band Syndrome History', `Left side affected historically.
Root cause: left gluteus medius weakness causing poor pelvic stability during running -> excessive hip adduction -> knee internal rotation -> IT band compression.
The Fredericson (Stanford, 2000) protocol is the evidence base: 6-week glute medius strengthening -> 92% of runners returned pain-free.
IT band prehab circuit is embedded in the plan 3-4x/week and must never be skipped.`),

  entry('clinical', 'Left-Side Asymmetry Pattern', `This is the most important clinical finding. Everything on the left side is tighter, weaker, or moves differently than the right:
- Left glute medius is weaker (gets sore first from prehab work)
- Left knee tracks improperly at full extension — collapses inward. Fine when bent.
- Left hip clicks during lateral leg swings (painless — likely IT band/TFL snapping over greater trochanter)
- Left hamstring quivers at end range (end-range weakness, NOT flexibility deficit — confirmed negative slump test)
- Whole left side feels chronically tight from hip to neck — longstanding, not training-induced
- When left-side tightness flares, it presents as whole-chain: calf, hamstring, hip, low back, upper back, neck — all on left

Needs PT evaluation to identify root cause (pelvic rotation, functional leg length discrepancy, hip ROM deficit, or motor pattern issue).`),

  entry('clinical', 'Anterior Pelvic Tilt Pattern', `Lower back wants to arch, lower abs want to sink. Hip flexors shortened from sitting.
Core tension difficult to release voluntarily — abs stay braced, breathing shifts to chest.
When he tries to release abs, tension shifts to low back.
Diaphragmatic breathing is difficult and needs daily practice.
Cues that work: "push belly out" mechanically forces ab release. Audible sighing exhales trigger relaxation reflex.
Supine hip flexor release (hug one knee, extend other leg) temporarily resets pelvic position.`),

  entry('clinical', 'Hamstring Pattern', `Feel "tight" but the issue is end-range weakness, not lack of flexibility.
Slump test was negative — neural tension is not primary driver (nerve glides still good maintenance).
Hamstrings quiver when locked out — nervous system doesn't feel safe in lengthened position.
RDLs with slow eccentrics are the primary fix — loaded lengthening builds end-range strength.
Single-leg RDL holds (bodyweight, 15-20 sec) in daily mobility routine for same purpose.
Static stretching is NOT the answer — addresses wrong problem and can increase DOMS sensitivity.
On days with hamstring DOMS, replace single-leg RDL holds with standing forward fold (soft knees, 30 sec).`),

  entry('clinical', 'Thoracic Mobility & Hip Rotation', `Thoracic: Cannot lock out arms overhead. Cannot overhead squat. Difficulty keeping shoulders back.
Traces to restricted thoracic extension from desk work. When mid-back is stuck in flexion, shoulder blades can't upwardly rotate.
Body compensates by arching lower back (connects to anterior pelvic tilt).
Foam roller thoracic extension is the single most important daily mobility exercise.
Half-kneeling overhead press serves as both strength exercise and mobility diagnostic.

Hip rotation: Hips default to heavy external rotation. Limited internal rotation, especially left.
90/90 hip switches with 5-sec holds address this. Hip internal rotation stretch added to daily routine.

Breathing: Tends toward chest-bracing. Extended exhales (4-count in, 6-8 count out) activate parasympathetic. Cue: exhale on effort/release, inhale to prepare.`),

  // --- Training ---
  entry('training', 'Plan Overview & Race', `Goal race: Honolulu Marathon, December 13, 2026, 5:00 AM start.
Plan duration: 38 weeks from March 21, 2026.
Course: mostly flat (80%+ under 1% grade). Two climbs around Diamond Head (miles 7-9 and 23.8-25).
Long exposed out-and-back on Kalanianaole Highway (miles 10-23) — mentally taxing, full sun.
Temperature: mid-60s at start, low 80s by 10 AM. High humidity. 16 aid stations every 2-3 miles.`),

  entry('training', 'Phase 1: Base Building (Weeks 1-12)', `March 21 - June 13 | Peak: ~25 mi/week | 3 run days/week
Mileage progression with down weeks every 3-4 weeks:
- Weeks 1-3: 15-18 mi/wk, long run 8-9 mi
- Week 4 (down): 12-14 mi/wk, long run 7 mi
- Weeks 5-7: 18-22 mi/wk, long run 10-11 mi
- Week 8 (down): 15-17 mi/wk, long run 8 mi
- Weeks 9-11: 22-25 mi/wk, long run 12-13 mi
- Week 12 (down): 17-19 mi/wk, long run 9 mi
Key focus: aerobic foundation, hip strength, mobility gains, establish all habits. Don't rush.`),

  entry('training', 'Phase 2: Aerobic Build (Weeks 13-20)', `June 14 - August 8 | Peak: ~33 mi/week | 4 run days/week
Add weekly tempo session. Begin fueling practice on long runs.
Tempo progression: 2x10 min -> 2x15 min -> 3x10 min tempo with jog recoveries.
Down weeks at 17 and 20. Tempo pace = "comfortably hard" — short phrases possible, conversation not.
If IT band twinges during tempo, back off to easy pace immediately.`),

  entry('training', 'Phases 3-5: Specificity through Taper (Weeks 21-38)', `Phase 3 (Weeks 21-26): Peak ~38 mi/wk, 4-5 run days. Marathon-pace segments in long runs. Heat acclimation begins.
Phase 4 (Weeks 27-35): Peak ~42 mi/wk, 5 run days. Key long runs: 20 mi dress rehearsals with race-day gear/breakfast/fueling. Peak 22 mi with MP miles 14-20.
Phase 5 Taper (Weeks 36-38): 70% -> 50% -> 30% volume. Race Dec 13. Trust training.`),

  entry('training', 'Mileage Rules & Weekly Schedule', `Never increase weekly volume more than 10%. Down week every 3rd or 4th week (20-25% cut).
Tuesday stays the short run (~35 min) all 38 weeks due to commute.
Extra volume from Thursday (extending to 50-55 min), Saturday (long run), Sunday (5th run day from Phase 3).
If mileage must be cut, protect the long run above all else.

Sleep protocol: 7.5-8 hours target. Screens off 10 PM, bed by 10:15-10:30. Caffeine cutoff 1 PM.
Monday: genuine rest day — no running, lifting, or rowing.
Saturday: long run day. Pre-run activation (bodyweight hip abductions + fire hydrants). Post-run: foam roll, substantial meal within 45 min, electrolytes.`),

  // --- Strength ---
  entry('strength', 'Strength A: Upper Body + Core (Friday)', `Warmup (5 min): Band pull-aparts (15), standing thoracic rotations (10 each), 10 bodyweight squats.
Power cleans or KB one-arm snatches — straight sets, 4x5 each arm. 90 sec-2 min rest. Neural primer, not conditioning.
Circuit: DB bench press (3x8-12), single-arm DB row (3x10-12 each), half-kneeling overhead press (3x8-10 each arm), cable face pulls (3x15-20), farmer's carries (3x40-60 sec).
Core circuit: Pallof press (2-3x10-12 each side), dead bugs (3x8-10 each side), hanging leg raises or ab wheel (3x8-12).
Volume compresses over phases: 50 min Phase 1-2, 45 min Phase 3, 40 min Phase 4, 30 min taper.`),

  entry('strength', 'Strength B: Lower Body + Prehab (Wednesday)', `Warmup (5 min): Leg swings, walking knee hugs, nerve glides, 90/90 hip switches.
Power cleans or KB snatches — straight sets, 4x5.
Circuit 1 (3 rounds): Front squat (8-10, watch left knee tracking), clamshells with band (15 each), hip abductions with band (15 each).
Circuit 2 (3 rounds): Romanian deadlift (8-10, slow 3-4 sec lowering), Bulgarian split squat (8-10 each, left leg first), single-leg glute bridge (12 each).
Finisher: Slow bodyweight mini squats (1x10), step-downs (3x10 each), Copenhagen plank (3x20-30 sec each).
Critical sequencing: Strength B is Wednesday to give 3 full days before Saturday long run.`),

  // --- Mobility ---
  entry('mobility', 'Daily Mobility Routine (17 min)', `Every morning including rest days:
1. Foam roller thoracic extension (90 sec) — park at each segment, extend, 3-4 breaths
2. Cat-cow (10 reps, slow, 3 sec each direction)
3. Thread the needle (8 each side) — note which side is tighter
4. Wall slides or floor angels (10 reps) — floor angels on sore days
5. 90/90 hip switches with hold (6 each side, 5 sec hold)
6. Hip internal rotation stretch (30 sec) — supine, knees bent, feet wide, knees fall inward
7. Half-kneeling hip flexor stretch + overhead reach (45 sec each side)
8. Single-leg RDL hold, bodyweight (15-20 sec each, 2 rounds) — skip on hamstring DOMS days
9. Diaphragmatic breathing (60 sec) — inhale 4 sec belly, exhale 6-8 sec`),

  entry('mobility', 'Monday Extended Flow (35-40 min)', `Do daily routine first, then add:
1. Constructive rest position (3-5 min) — START HERE. Calms nervous system.
2. Supine hip flexor release (60 sec each side) — left side gets extra 30 sec
3. Pigeon pose (90 sec each side) — figure-4 on back if knee hurts
4. Supine spinal twist (90 sec each side)
5. Doorway pec stretch (45 sec each side, 2 heights) — shoulder and above shoulder
6. Legs up the wall (3-5 min) — decompresses spine, drains leg fluid
7. Prone press-ups / cobra (10 reps)
8. Extended diaphragmatic breathing (2-3 min)`),

  // --- IT Band Prehab ---
  entry('clinical', 'IT Band Prehab Circuit', `Full circuit after Tuesday/Thursday runs + within Strength B:

Side-lying (right side first): Left hip abductions with band 3x15-20 + left clamshells with band 3x15-20 (supersetted).
Roll to left side: Right hip abductions 3x15-20 + right clamshells 3x15-20.
On back: Single-leg glute bridges 3x12-15 each — drop to double-leg if fatigued.
Strength B days add: slow bodyweight mini squats 1x10, step-downs 3x10 each, Copenhagen plank 3x20-30 sec.

Pre-run activation (Saturday only, 5 min): Standing hip abductions + fire hydrants, 15 each, NO band — bodyweight only.

WHY prehab goes AFTER running: Full banded circuit fatigues glute medius. Running on pre-fatigued glute medius recreates the weakness pattern that causes ITBS.`),

  // --- Cross-Training ---
  entry('cross-training', 'Concept 2 Rowing', `Three benefits: aerobic fitness without IT band stress, upper back/core strength, dynamic thoracic mobility.

Schedule:
- Thursday 5:15 PM: Easy Zone 2, 25-30 min. HR ~130-145. Damper 3-5, stroke rate 18-22. Followed by thoracic mobility.
- Sunday afternoon (optional): 20-30 min easy. Skip if fatigued from Saturday.
- Wednesday Phase 2+ (optional): 15-20 min post-strength cooldown.

Form: Drive sequence legs -> back -> arms (reverse on recovery).
Breathing: One breath per stroke at Zone 2 — exhale on drive, inhale on recovery.

Post-row mobility (Thursday): Foam roller thoracic extension 2 min, thread the needles 8 each side, doorway pec stretch 45 sec each side.`),

  entry('cross-training', 'Strides (Thursday Runs)', `After easy run, find flat stretch ~80-100 meters. 6 strides total.
Accelerate gradually to 85-90% of top speed over first 20-30m. Hold 30-40m. Decelerate naturally.
~20 seconds per stride. Walk back between each (60-90 sec recovery).
Feel: light, quick, tall posture. "Fast and relaxed" not "hard and grinding." Never all-out.
Purpose: fast-twitch recruitment, neuromuscular coordination, running mechanics reinforcement.
Where: flat paths in Golden Gate Park. Avoid sidewalks with cross streets.`),

  // --- Nutrition ---
  entry('nutrition', 'Nutrition & Fueling Guidelines', `Daily protein target: ~120g. Track loosely. Achievable with eggs, dairy, tofu, legumes.

Breakfast by scenario:
- Fasted runs (Tue/Thu): No food before easy runs under 60 min. Water and coffee only.
- Saturday pre-long-run: Progressive. Weeks 1-8: coffee + banana. Weeks 9+: 2 eggs on toast + banana. Weeks 21+: locked-in race-day breakfast.

Hydration: Pre-run (>60 min): 16-20 oz water in 2 hours before. Post-run (>60 min): electrolytes (Nuun or LMNT), not just plain water.

Race-day fueling: 60g carbs/hour. One gel every 30-35 min starting at mile 3. Practice from Phase 2 onward. Same brand/flavor in training and racing.

Protein insurance: Whey or pea protein shake if meals land under 90g by evening.`),

  // --- Red Flags ---
  entry('red-flags', 'Red Flags & Adjustment Protocols', `IT BAND TWINGES DURING RUN: Stop. Walk home. 2-3 days off running (row instead). Double prehab. Return at 20% reduced distance.
IT BAND TIGHT BEFORE RUN: Pre-run warmup. If still there at mile 1: tightness fading = keep going. Outer knee pain staying/worsening = stop.
IT BAND PAIN >1 WEEK: See PT. Fredericson 6-week protocol available.
GENERAL FATIGUE / ELEVATED RHR: Extra rest day. If 3+ days, take full down week.
MISSED A WEEK: Don't make up mileage. Resume plan, cut 10-15% from next two weeks.
MISSED STRENGTH SESSION: Skip it. Don't double up.
DOMS INTERFERING WITH RUNNING: Shorten the run, don't skip it. Easy movement helps DOMS resolve.
NOVEL EXERCISE DOMS: Start lighter than you think. Mike recovers slowly from unfamiliar stimuli.
PUSHING PAST PRESCRIBED DISTANCE: Acknowledge without lecturing, but be firm about distance caps on subsequent long runs.
WHOLE-SIDE TIGHTNESS: Left-side pattern manifesting. Floor-based passive recovery. See PT.
CAFFEINE WITHDRAWAL: If he skips coffee, headache doesn't respond to water/food/salt. Fix is caffeine.`),

  // --- Race ---
  entry('race', 'Honolulu Marathon Race Strategy', `Course breakdown:
- Miles 1-5 (downtown loop): Flat, dark, crowded. 10-15 sec/mi slower than MP. Don't weave.
- Miles 5-10 (Waikiki to Diamond Head): First climb. Steady rhythm.
- Miles 10-18 (Kahala to Hawaii Kai): Flat, exposed highway. Sun rises, heat builds. Every aid station.
- Miles 18-23 (turnaround to Kahala): Flat, exposed, hot. Mental grind. 1-mile segments.
- Miles 23.8-25 (Diamond Head #2): Decisive. Maintain effort, not pace.
- Miles 25-26.2: Everything left.

Heat: Drink at every aid station from start. Alternate water and electrolyte. Pour water over head/neck after sunrise. Light colors, visor (not hat).
IT band insurance: 5 min clamshells and hip abductions before leaving hotel. If lateral knee pain: shorten stride, increase cadence, widen step width.
Race week: Arrive Honolulu by Dec 9. Shakeout jog on course Dec 10/11.`),

  entry('race', 'Heat Acclimation Protocol', `Weeks 21-26: Post-run sauna 15->25 min, 3x/week.
Weeks 27-33: Sauna 25-30 min + occasional overdressed treadmill run. 3x/week + 1x overdressed.
Weeks 33-35: Daily sauna 20-25 min post-training.
Weeks 36-38: Stop 3-4 days pre-race. Adaptations last 2-3 weeks.

Sauna options: fitLOCALfit doesn't have one. Options: gym with sauna near Burlingame, Korean spa, hot baths at home (104F, 20-30 min), heated vinyasa at YogaBeach SF.
Reduce training volume ~10% during first week of sauna use. Monitor morning RHR — if elevated 5+ bpm, back off.`),

  // --- Routes ---
  entry('routes', 'Running Routes', `FROM HOME (no drive):
1. Golden Gate Park Perimeter Loop (~7.4 mi, add Stow Lake for 8+) — default long run route, JFK car-free
2. Sunset Dunes / Great Highway + Lake Merced (~8 mi) — flat coastal, good for tired legs
3. Ocean Beach north to Lands End (~8 mi, some hills) — more adventurous, uneven on Lands End
4. Andytown to Golden Gate Bridge via Lands End (~10 mi) — Mike loves this route

DRIVE-TO (15-40 min):
5. Crissy Field / Presidio Loop (~7-8 mi, 15 min) — best views in city
6. Sawyer Camp Trail (~8 mi OAB, 25 min) — excellent for 12-16 mi long runs
7. Marin Headlands / Gerbode Valley (~8-10 mi, 25 min) — serious hills, fresh legs only
8. Tennessee Valley to Muir Beach (~8 mi, 35 min) — hilly and beautiful
9. Mt. Tamalpais / Phoenix Lake (~6-8 mi, 35 min) — mental toughness day
10. Devil's Slide Trail + Pacifica (~5-8 mi, 20 min) — flat, spectacular
11. Half Moon Bay Coastal Trail (~8-10 mi, 30 min) — excellent long run alternative
12-14. Purisima Creek, Huddart Park, Wunderlich Park (30-40 min) — trail adventures

Route logic: Default long runs = options 1-2. Every 3-4 weeks swap for option 5 or 11. Trails once a month max, never before key long run. Avoid trails when IT band is irritable.`),

  // --- Gear ---
  entry('gear', 'Gear', `Shoes: Altra Torin 8 (daily/long), Altra Provision 8 (shorter/faster), Via Olympus 2 for race day (buy 6-8 weeks pre-race, break in on final long runs). Always wear visor on outdoor runs.

Home equipment: Concept 2 RowErg (PM5 pairs with Apple Watch), 36" foam roller, Perform Better mini band set (yellow=light clamshells, green=medium abductions), ab wheel, yoga mat, lacrosse ball, protein powder (whey or pea), Nuun or LMNT electrolytes, Polar H10 chest strap (optional for rowing/tempo).`),

  // --- Medical ---
  entry('medical', 'Medical & PT Status', `Current appointments:
- Candice Lee at Kauno PT (4334 Geary Blvd, Inner Richmond): April 24, 2026
- Ocean Beach PT (3401 Taraval): June 18, 2026 (backup/followup)

Insurance: Blue Shield CA PPO 300, CA North. PT copay $25/visit in-network, no deductible. No referral required for PPO. PCP referral requested through UCSF MyChart.

What to tell PT: "Left knee tracks improperly at full extension. Chronic left-side tightness hip to neck. Left hip clicks during lateral swings. Hamstrings quiver at end range. Anterior pelvic tilt — hip flexors shortened, difficulty releasing core tension. IT band history. Training for Honolulu Marathon Dec 13. Want root cause of left-side asymmetry, gait analysis, and corrective exercises to integrate with training."

IMPORTANT: After PT assessment, update knowledge base with corrective exercises, diagnoses, or modifications.`),
]
