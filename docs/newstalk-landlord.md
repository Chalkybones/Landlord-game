# 📻 Newstalk Landlord — radio script & casting sheet

The in-game satirical talkback station for *Kiwi Landlord Empire*. Voices from
ElevenLabs (real NZ voices from the Voice Library), directed for performance,
generated once and played as static clips.

**Generate with the expressive model (v3 / "eleven_v3")** so the `[bracketed]`
delivery tags are *performed* rather than read aloud. On the older v2 models the
tags get spoken literally — if you must use v2, strip the brackets.

---

## Part 1 — Casting sheet

Four voices are essential; the other two can be doubled up to save sourcing.

Cast is locked — voices chosen from the ElevenLabs Voice Library:

| Key | Character | ElevenLabs Voice ID | Stab / Style | Direction |
|-----|-----------|---------------------|--------------|-----------|
| **HOST** | Macka, the host | `53CG2aO2HU48thT3QnMl` | 55 / 35 | Dry, smug, seen-it-all. Never rattled. Talkback chumminess with a blade under it. |
| **BAZ** | furious renter | `TeKvcwcnCefHCOr0Q7dM` | 30 / 70 | Wound-up, righteous, cracks into shouting. He *means* it — that's why it's funny. |
| **HEMI** | hard-case renter (the crack-up) | `BHhU6fTKdSX6bN7T1tpz` | 45 / 55 | Laid-back, deadpan-funny, warm. The **sharpest** guy on the show — lands the truest line with a grin. Funny *because he's right*, never the butt of the joke. |
| **GEOFF** | smug investor | `82kwqgRqvxoiNwemeENJ` | 60 / 40 | Oily, self-satisfied, condescending calm. Believes every word. |
| **SANDRA** | warm mum / newsreader | `sxEoZ67pB0EMoWOZZ37G` | caller **55 / 35** · news **72 / 18** | Warm and weary as a caller; flat and deadpan as the newsreader. Does double duty. |
| **VAL** | the nan | `pcKdPWtbF6bM9o7NHjCI` | 65 / 25 | Kind, unhurried, quietly devastating. Not angry — sad, and correct. |

**Which voice reads what:** callers use their own names above · `news_*` → **SANDRA** (news settings) · `ad_*` → **SANDRA or HOST** at bright/fast (Stab 40 / Style 65).

**Pronunciation notes** (add as an alias if a voice fumbles them):
Kāinga Ora ≈ "KY-nga OR-ah" · Papakura ≈ "papa-KOO-ra" · Aotearoa ≈ "ah-oh-tay-ah-ROH-ah" · Remuera ≈ "rem-YOU-era" · OCR = say "the O-C-R".

---

## Part 2 — The scripts

Each line: `clip_id` · **[when it plays]** · the tagged text to paste.

### A · Station IDs (HOST) — when the radio is switched on / top of hour
- `host_id_1` · [dry] You're listening to Newstalk Landlord — PortfolioMax F-M. Where the rent's gone up… and so have the takes.
- `host_id_2` · [warm] This is Newstalk Landlord — the people's station. Well. The people who own six houses. [chuckles]
- `host_id_3` · Ten-eighty on the dial, and if you can afford the radio, you're doing better than most. [dry] Macka with you till late.
- `host_id_4` · [smug] Newstalk Landlord. We don't cause the housing crisis — we just monetise the coverage.

### B · Throws (HOST) — between segments
- `host_throw_caller_1` · [dry] Lines are lighting up. Let's go to the phones.
- `host_throw_caller_2` · We've got a caller who sounds… [chuckles] emotional. You're on Newstalk Landlord, go ahead.
- `host_throw_caller_3` · [warm] Talk to me. What's got you dialling in tonight?
- `host_throw_ad_1` · [smug] Quick word from a sponsor — and they're all sponsors, really.
- `host_back_1` · [warm] And we're back. Newstalk Landlord: the sound of a market working exactly as designed.

### C · Callers — the core (fired by what you just did in-game)

**→ You evicted a tenant**
- `baz_evict_1` · [agitated] Yeah gidday Macka — this bloke's just ninety-day'd a whole family. No reason! You don't need a reason anymore — [shouting] that's the whole POINT now, isn't it?!
- `baz_evict_2` · [exasperated] A nurse, Macka. He evicted a NURSE. Re-let it Friday for a hundred more. [scoffs] "Housing provider." Yeah. Righto.
- `val_evict_1` · [gentle] That family had little ones at the local school, dear. Where do they go now? [sighs] Nobody ever seems to ask where they go.

**→ You raised the rent / squeezed**
- `baz_rent_1` · [agitated] Rent's up AGAIN! And the wages sent their apologies! [sarcastic] But no, it's the smashed avo, that's the problem.
- `geoff_rent_1` · [smug] Nobody's forcing anyone to rent. If they don't like the price, well — the market has spoken. [chuckles] It usually says "pay me."
- `val_rent_1` · [gentle] My grandson pays two-thirds of his wage to a man he's never met. [sighs] In my day the landlord at least had the decency to look you in the eye.

**→ You ignored Healthy Homes / there's mould**
- `baz_mould_1` · [disgusted] Mould up the walls, Macka! Kids coughing all winter! And he calls it — [scoffs] "a natural feature of the character home."
- `geoff_mould_1` · [smug] A little condensation builds character. Open a window. [chuckles] You're welcome.

**→ Milestone / "Landlord of the Year" / you levelled up**
- `baz_award_1` · [incredulous] Landlord of the YEAR?! For THIS clown?! [shouting] Give him a trophy for the MOULD while you're at it!
- `geoff_award_1` · [smug] Credit where it's due. A portfolio like that doesn't build itself. [chuckles] Well — the tenants build it. But you know what I mean.

**→ Public scrutiny is high (the pile-on)**
- `baz_heat_1` · [worked up] Everyone can see it now! It's all over the internet, he's finished! [beat, deflating] …he's not finished, is he. They never are.
- `val_heat_1` · [gentle] I do hope someone's keeping a record of all this. [pause] Someone really should.

**→ You did something decent (fixed the heat pump / sold to tenants at cost)**
- `val_decent_1` · [warm, surprised] Well, I never. A landlord did a *kind* thing. [soft chuckle] I'd sit down from the shock, if I could afford the chair.
- `baz_decent_1` · [suspicious] One landlord does one decent thing and we throw a parade? [softening] …nah but, fair's fair. Good on him. Once.

**→ Market correction / crash**
- `geoff_crash_1` · [false calm] It's a healthy correction. Perfectly healthy. [swallows] The fundamentals are — the fundamentals are fine. [less sure] They're fine.
- `baz_crash_1` · [gleeful] Aw NO. The poor leveraged darlings! [laughs] My heart bleeds. It bleeds RENT, Macka!

**→ Filler (random, when nothing specific happened)**
- `baz_filler_1` · [ranting] Eight hundred grand for a leaky two-bed facing a brick WALL — and they call the wall "a feature"! [shouting] IT'S A WALL!
- `geoff_filler_1` · [smug] I tell the young ones: just buy a house. It's not hard. I did it four times. [chuckles] With their rent, but still.
- `val_filler_1` · [gentle] I rang to say the talkback's got awfully shouty lately. [pause] Mind you. So has the rent.

**→ Hemi, the hard-case (the crack-up — wry, warm, and the realest take on the show)**
- `hemi_intro_1` · **[general/filler]** [laid-back, amused] Yeah kia ora Macka. Long-time renter, first-time home-owner — [chuckles] nah I'm having you on, I'll never own a home. Just ringing for the company.
- `hemi_rent_1` · **[rent hike]** [dry, amused] Rent went up again, eh. I've stopped being angry, I just *admire* it now. [chuckles] It's like a magic trick. Where'd me whole pay go? Gone. Ta-da.
- `hemi_evict_1` · **[eviction]** [wry] Me cousin got the ninety-day. Landlord "needed it for family." [beat] Family moved in Tuesday — off Trade Me, four-fifty a week. [chuckles] Must be distant rellies, eh.
- `hemi_brisbane_1` · **[filler]** [cheerful] Half me mates are in Brisbane now. I'd go too, but someone's gotta stay and lose the auctions. [laughs] Keep the numbers up for the boomers, eh.
- `hemi_decent_1` · **[you did a decent thing]** [pleasantly surprised] Ayy, a landlord did something *nice?* [chuckles] Careful Macka — keep that up and they'll take his licence off him.
- `hemi_heat_1` · **[high scrutiny]** [amused, knowing] Everyone's real angry online, eh. [dry] Give it a week. We'll be angry at something else, and this fulla'll have bought another one. [warm] Love ya, gotta go.
- `hemi_filler_2` · **[filler]** [hard-case] Did the sums on buying, Macka. Turns out I need a deposit the size of a small Lotto win and a dad who bought in the nineties. [chuckles] I've got one of those. It's the sad one.

### D · Ad reads (ADV) — one per fake brand
- `ad_equitymate` · [bright] EquityMate Home Loans! Seven times your income, zero times your chances! [fast] Feesapply — as does gravity.
- `ad_brisbane` · [wistful, then bright] Brisbane Departures. Same rent… wages that aren't a dare. Window seat?
- `ad_methbgone` · [chirpy] Meth-Be-Gone! We test, we find, YOU bill the tenant! [conspiratorial] Positive in three seconds, results in three weeks, bond withheld either way!
- `ad_afteryay` · [bright] AfterYay! Buy your bond now, panic in four easy instalments! [fast] Missed a payment? So did your landlord — on the maintenance.
- `ad_airboomer` · [smarmy] Air-Boomer B-and-B. Superhost your nan's third investment property. [chuckles] A nurse used to live here. Now? A stag-do from Ballarat.
- `ad_brightline` · [bright] Bright-Line Flippers! Buy it, hold twenty-four months, flip it tax-free! [smug] Housing's a sport now. No losers — except the players.
- `ad_loophole` · [smooth] Loophole and Sons, Consents. The R-M-A is nine hundred pages. [conspiratorial] We've read the good bits. Your dinner in Herne Bay is one hundred percent deductible — so is our silence.
- `ad_cosykiwi` · [chirpy] Cosy Kiwi Rentals! "Warm and dry"… [fast, hushed] not warm, not dry, legally required to imply otherwise.
- `ad_winston` · [grand] Winston's Racing Syndicate. Invest in a horse — receive a housing policy. [dry] The horse has better odds than a first-home buyer.

### E · News stings (NEWS) — deadpan, played dead straight
- `news_1` · [deadpan] Newstalk Landlord news. Rents fell nationally for a second month — somehow, not at any property owned by tonight's callers.
- `news_2` · [deadpan] The median house price has quietly purchased a second house.
- `news_3` · [deadpan] The Reserve Bank has cut the O-C-R six times and hiked it once. Economists are describing this as "a plan."
- `news_4` · [deadpan] A first-home buyer has saved a twenty percent deposit. The house has risen twenty-one percent. She is congratulated for "nearly making it."
- `news_5` · [deadpan] Kāinga Ora will sell another nine hundred state homes. The waitlist, unbothered, remains four digits.
- `news_6` · [deadpan] Pet bonds are now legal. A landlord has charged two weeks' rent for a goldfish. The goldfish is listed as co-signer.
- `news_7` · [deadpan] Net thirty-seven thousand New Zealanders have left for Australia. New arrivals will fill the seats — still warm — from the Brisbane flight.
- `news_8` · [deadpan] And in sport tonight: housing.

### F · Host reactions (HOST) — the nemesis & big moments
- `host_vane_1` · [lowered] Word is Fiona Vane's been making calls. [dry] If you've done nothing wrong you've nothing to — no. Even I can't finish that one.
- `host_vane_publish` · [grave, then dry] Well. It's out. Vane's dropped the lot — front page, every outlet. [beat] Big night for the shredding industry.
- `host_phaseup` · [warm] Word reaching the studio of a big new player in the market. [smug] Everyone say "provider." That's the word we use now.

### G · Ending lines (one per ending — the closer)
- `end_minister` · [grand, dripping] Ladies and gentlemen — the new Minister of Housing. [dry] Poacher, gamekeeper. Turns out it's the same salary.
- `end_empire` · [awed] Four hundred million dollars. [dry] You're not a landlord anymore, mate. You're a weather system with a mortgage.
- `end_expose` · [grave] Fiona Vane got there in the end. She always does. [pause] The immunity, it turns out, was also rented. And you missed a payment.
- `end_collapse` · [false calm, cracking] It was a healthy correction. Perfectly heal— [gulp] …okay, it wasn't. Bank's taken the lot. [dry] Next caller.
- `end_reform` · [warm, genuine] He sold the houses back to the families living in them. At cost. [pause] The forums called him "compromised." The families called him the best they ever had. [gentle] Funny old world.

---

## Part 3 — Music & stings (ElevenLabs Music / "Eleven Music")

Short, one-off. Prompts to generate against.

- `mus_jingle` — **Station jingle** (~8s): *"Upbeat 1980s AM-radio station jingle, cheesy sung male jingle-singers, 'Newstalk Land-lord!', bright synth stab, local-radio energy."*
- `mus_bed` — **Hold-muzak loop** (~30s, seamless): *"Bland corporate elevator muzak, smooth jazz-lite, major key, relentlessly pleasant, loopable."* → I detune/sour this live as scrutiny rises. No extra clip needed.
- `mus_sting_win` (~3s): *"Short triumphant brass fanfare, game-show winner, celebratory."*
- `mus_sting_lose` (~3s): *"Short sad trombone, wah-wah-wah, comedic failure sting."*
- (optional) `mus_ad_equitymate` (~12s): a sung jingle version of the EquityMate ad, if you want an earworm instead of the spoken read.

*(Radio static, tuning sweeps and inter-segment crackle are already generated live in the browser via Web Audio — no clips needed for those.)*

---

## Part 4 — Numbers & process

- **~59 voice clips + ~4 music pieces.** Voice avg ~180 chars → **≈ 10–11k characters total**, one-off. Fits inside a single month of ElevenLabs' entry tier (and a lean cut fits the free tier). Music is metered separately but it's only a few short pieces.
- **Generate once → static/cached → free forever, regardless of player count.**
- **Suggested order:**
  1. ✅ Voices picked (IDs are in the casting sheet above).
  2. **Test batch first — one line per voice** (use the **v3 / expressive model** so the tags perform):
     `host_id_1` · `baz_evict_1` · `hemi_evict_1` · `geoff_rent_1` · `val_decent_1` · `news_2` · `ad_equitymate`
     Listen, then tune stability/style/tags per voice.
  3. Once it sings, batch the rest.
  4. Hand me the files (or wire the Supabase function) and I map each `clip_id` to its in-game trigger and build the **📻 Newstalk Landlord** player.

*File naming when you export:* just keep the `clip_id` as the filename (e.g. `baz_evict_1.mp3`) and I can wire them in almost automatically.
