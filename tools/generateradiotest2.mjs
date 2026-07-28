#!/usr/bin/env node
/*  Newstalk Landlord — TEST BATCH v2  (accent-locked)
 *  Fixes the "random accents" problem: forces the STABLE model and uses
 *  high Stability + high Similarity so each voice holds its Kiwi accent
 *  instead of wandering. Less theatrical, but consistent — we add the
 *  personality back once the accents are solid.
 *
 *  RUN:   node generateradiotest2.mjs sk_your_elevenlabs_key
 *  OUT:   ./newstalk-audio/*.mp3   → send me the 7 files
 *
 *  Model defaults to eleven_multilingual_v2 (rock-solid for accent).
 *  Override if you want:  MODEL=eleven_turbo_v2_5 node generateradiotest2.mjs sk_...
 */

import { writeFile, mkdir } from 'node:fs/promises';

const API_KEY = process.env.ELEVENLABS_API_KEY || process.argv[2];
const MODEL   = process.env.MODEL || 'eleven_multilingual_v2';
const SIMILARITY = 0.85;   // hug the original voice → holds the accent
const OUT_DIR = './newstalk-audio';

if (!API_KEY) { console.error('\n❌  Run:  node generateradiotest2.mjs sk_your_key\n'); process.exit(1); }

// Higher stability = accent stays put. Style kept low (high style destabilises).
const V = {
  HOST:   { id: '53CG2aO2HU48thT3QnMl', stability: 0.60, style: 0.20 },
  BAZ:    { id: 'TeKvcwcnCefHCOr0Q7dM', stability: 0.50, style: 0.25 },
  HEMI:   { id: 'BHhU6fTKdSX6bN7T1tpz', stability: 0.55, style: 0.25 },
  GEOFF:  { id: '82kwqgRqvxoiNwemeENJ', stability: 0.65, style: 0.20 },
  SANDRA: { id: 'sxEoZ67pB0EMoWOZZ37G', stability: 0.60, style: 0.15 },
  NEWS:   { id: 'sxEoZ67pB0EMoWOZZ37G', stability: 0.75, style: 0.10 },
  VAL:    { id: 'pcKdPWtbF6bM9o7NHjCI', stability: 0.65, style: 0.15 },
  ADV:    { id: 'sxEoZ67pB0EMoWOZZ37G', stability: 0.55, style: 0.30 },
};

// v2 reads [tags] literally, so we strip them. Caps / — / … still shape delivery.
const strip = (t) => t.replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();

const CLIPS = [
  { id: 'host_id_1',     v: 'HOST',  text: `You're listening to Newstalk Landlord — PortfolioMax F-M. Where the rent's gone up… and so have the takes.` },
  { id: 'baz_evict_1',   v: 'BAZ',   text: `Yeah gidday Macka — this bloke's just ninety-day'd a whole family. No reason! You don't need a reason anymore — that's the whole POINT now, isn't it?!` },
  { id: 'hemi_evict_1',  v: 'HEMI',  text: `Me cousin got the ninety-day. Landlord "needed it for family." Family moved in Tuesday — off Trade Me, four-fifty a week. Must be distant rellies, eh.` },
  { id: 'geoff_rent_1',  v: 'GEOFF', text: `Nobody's forcing anyone to rent. If they don't like the price, well — the market has spoken. It usually says "pay me."` },
  { id: 'val_decent_1',  v: 'VAL',   text: `Well, I never. A landlord did a kind thing. I'd sit down from the shock, if I could afford the chair.` },
  { id: 'news_2',        v: 'NEWS',  text: `The median house price has quietly purchased a second house.` },
  { id: 'ad_equitymate', v: 'ADV',   text: `EquityMate Home Loans! Seven times your income, zero times your chances! Fees apply — as does gravity.` },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`\n🎙️  Accent-locked pass — model "${MODEL}", similarity ${SIMILARITY}\n`);
  let ok = 0;
  for (const c of CLIPS) {
    const voice = V[c.v];
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({
          text: strip(c.text),
          model_id: MODEL,
          voice_settings: { stability: voice.stability, similarity_boost: SIMILARITY, style: voice.style, use_speaker_boost: true },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text().catch(() => '')).slice(0, 160)}`);
      const buf = Buffer.from(await res.arrayBuffer());
      await writeFile(`${OUT_DIR}/${c.id}.mp3`, buf);
      console.log(`   ✅  ${c.id}.mp3   (${c.v} · stab ${voice.stability} · style ${voice.style} · ${(buf.length/1024).toFixed(0)} KB)`);
      ok++; await sleep(400);
    } catch (e) { console.log(`   ❌  ${c.id} — ${e.message}`); }
  }
  console.log(`\n${ok}/${CLIPS.length} done → ${OUT_DIR}/`);
  console.log(`\nHave a listen: does each voice now hold ONE steady accent? If a specific one still wanders, tell me which and I'll push its stability higher.\n`);
})();
