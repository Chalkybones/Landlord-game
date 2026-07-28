#!/usr/bin/env node
/*  Newstalk Landlord — TEST BATCH generator
 *  Generates the 7 audition clips (one per voice) via the ElevenLabs API.
 *  Your voice IDs + per-character settings are baked in.
 *
 *  ── HOW TO RUN ─────────────────────────────────────────────────────────
 *    1. Have Node 18+ installed  (check: `node --version`)
 *    2. Save this file somewhere, open a terminal in that folder.
 *    3. Run ONE of:
 *         macОS/Linux:  ELEVENLABS_API_KEY=sk_your_key  node generate-radio-test.mjs
 *         Windows PS :  $env:ELEVENLABS_API_KEY="sk_your_key"; node generate-radio-test.mjs
 *       …or just pass the key as the first argument:
 *         node generate-radio-test.mjs sk_your_key
 *    4. MP3s land in ./newstalk-audio/ . Send me those 7 files.
 *
 *  Model: tries the expressive "eleven_v3" first (so the [tags] PERFORM).
 *  If your account/tier can't use v3 over the API, it auto-falls back to
 *  eleven_multilingual_v2 and strips the [tags] (still your NZ voices, just
 *  less theatrical). You can also force a model with  MODEL=eleven_v3  etc.
 *  ───────────────────────────────────────────────────────────────────────
 */

import { writeFile, mkdir } from 'node:fs/promises';

const API_KEY = process.env.ELEVENLABS_API_KEY || process.argv[2];
let   MODEL   = process.env.MODEL || 'eleven_v3';
const OUT_DIR = './newstalk-audio';

if (!API_KEY) {
  console.error('\n❌  No API key.  Run:  node generate-radio-test.mjs sk_your_key\n');
  process.exit(1);
}

// character → per-voice settings (from the casting sheet)
const V = {
  HOST:   { id: '53CG2aO2HU48thT3QnMl', stability: 0.55, style: 0.35 },
  BAZ:    { id: 'TeKvcwcnCefHCOr0Q7dM', stability: 0.30, style: 0.70 },
  HEMI:   { id: 'BHhU6fTKdSX6bN7T1tpz', stability: 0.45, style: 0.55 },
  GEOFF:  { id: '82kwqgRqvxoiNwemeENJ', stability: 0.60, style: 0.40 },
  SANDRA: { id: 'sxEoZ67pB0EMoWOZZ37G', stability: 0.55, style: 0.35 },
  NEWS:   { id: 'sxEoZ67pB0EMoWOZZ37G', stability: 0.72, style: 0.18 }, // Sandra, deadpan
  VAL:    { id: 'pcKdPWtbF6bM9o7NHjCI', stability: 0.65, style: 0.25 },
  ADV:    { id: 'sxEoZ67pB0EMoWOZZ37G', stability: 0.40, style: 0.65 }, // Sandra, bright
};

// the 7-line test batch — one per voice
const CLIPS = [
  { id: 'host_id_1',     v: 'HOST',  text: `[dry] You're listening to Newstalk Landlord — PortfolioMax F-M. Where the rent's gone up… and so have the takes.` },
  { id: 'baz_evict_1',   v: 'BAZ',   text: `[agitated] Yeah gidday Macka — this bloke's just ninety-day'd a whole family. No reason! You don't need a reason anymore — [shouting] that's the whole POINT now, isn't it?!` },
  { id: 'hemi_evict_1',  v: 'HEMI',  text: `[wry] Me cousin got the ninety-day. Landlord "needed it for family." [beat] Family moved in Tuesday — off Trade Me, four-fifty a week. [chuckles] Must be distant rellies, eh.` },
  { id: 'geoff_rent_1',  v: 'GEOFF', text: `[smug] Nobody's forcing anyone to rent. If they don't like the price, well — the market has spoken. [chuckles] It usually says "pay me."` },
  { id: 'val_decent_1',  v: 'VAL',   text: `[warm, surprised] Well, I never. A landlord did a kind thing. [soft chuckle] I'd sit down from the shock, if I could afford the chair.` },
  { id: 'news_2',        v: 'NEWS',  text: `[deadpan] The median house price has quietly purchased a second house.` },
  { id: 'ad_equitymate', v: 'ADV',   text: `[bright] EquityMate Home Loans! Seven times your income, zero times your chances! [fast] Fees apply — as does gravity.` },
];

const stripTags = (t) => t.replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(clip, model) {
  const voice = V[clip.v];
  const text = model.includes('_v3') ? clip.text : stripTags(clip.text);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: voice.stability, similarity_boost: 0.75, style: voice.style, use_speaker_boost: true },
      }),
    }
  );
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    const modelIssue = res.status === 400 || res.status === 403 || /model/i.test(msg);
    const err = new Error(`HTTP ${res.status} — ${msg.slice(0, 200)}`);
    err.modelIssue = modelIssue;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

(async () => {
  await mkdir(OUT_DIR, { recursive: true });
  console.log(`\n🎙️  Newstalk Landlord — generating ${CLIPS.length} test clips with "${MODEL}"…\n`);
  let ok = 0, fellBack = false;

  for (const clip of CLIPS) {
    try {
      let buf;
      try {
        buf = await generate(clip, MODEL);
      } catch (e) {
        if (e.modelIssue && MODEL.includes('_v3') && !fellBack) {
          console.log(`   ⚠️  "${MODEL}" not available over your API — falling back to eleven_multilingual_v2 (tags stripped).\n`);
          MODEL = 'eleven_multilingual_v2';
          fellBack = true;
          buf = await generate(clip, MODEL);
        } else throw e;
      }
      await writeFile(`${OUT_DIR}/${clip.id}.mp3`, buf);
      console.log(`   ✅  ${clip.id}.mp3   (${clip.v}, ${(buf.length / 1024).toFixed(0)} KB)`);
      ok++;
      await sleep(400); // be gentle on rate limits
    } catch (e) {
      console.log(`   ❌  ${clip.id}  — ${e.message}`);
    }
  }

  console.log(`\n${ok}/${CLIPS.length} done → ${OUT_DIR}/  (model used: ${MODEL})`);
  console.log(fellBack ? `\nℹ️  Ran on v2. For the theatrical [tag] performances, generate in the ElevenLabs app (v3), or tell me and we'll decide.\n`
                       : `\n🎉  v3 worked — the [tags] performed. Send me the 7 files and I'll wire them into the game.\n`);
})();
