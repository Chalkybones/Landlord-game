/* ==========================================================================
   KIWI LANDLORD EMPIRE  —  "PortfolioMax™"   (Election Year Edition, 2026)
   A satire of Aotearoa's housing crisis.

   The loop:  deposit + mortgage -> squeeze tenants -> cash + borrowing power
              -> buy influence -> suppress scrutiny & deregulate -> leverage up
              and squeeze harder.  Wealth buys the political immunity — and the
              bank buys you the homes a first-home buyer will never be lent.

   Property is financed the way it really is in NZ 2026: an investor deposit
   (~35%), a mortgage on the rest, weekly interest, and a bank that will lend
   you up to 7× income (counting ~78% of your rent) — while it lends a nurse
   6× and counts none of hers. Prices, rents, LVR/DTI, the OCR and the
   7 November election are all real. Everything is data-driven.
   ========================================================================== */

'use strict';

/* ------------------------------------------------------------------ CONFIG */
const CFG = {
    START_CASH: 145000,        // a real investor deposit — however you scraped it (most can't)
    BASE_INCOME: 108000,       // your household salary, for the bank's DTI test
    DEFAULT_SPEED: 5,          // real seconds per in-game week
    BASE_HEAT_DECAY: 2.5,      // scrutiny lost per week with no help
    HEAT_MAX: 100,
    OFFLINE_CAP_HOURS: 8,
    NEWS_COOLDOWN: 24,
    EVENT_COOLDOWN: 6,
    DILEMMA_COOLDOWN: 38,       // min real seconds between interactive dilemmas
    DILEMMA_PROB: 0.16,         // per-eligible-week chance one fires
    SAVE_KEY: 'kiwiLandlordEmpire_v2',
    LEGACY_BONUS: 0.15,        // +15% permanent rent per Restructure
    // --- the bank ---
    DTI: 7,                    // investors: borrow up to 7× income (owner-occupiers get 6×)
    LVR_CAP: 0.75,             // can't owe more than 75% of portfolio value
    RENT_SHADE: 0.78,          // bank counts ~78% of gross rent as income
    MORTGAGE_RATE: 0.055,      // starting interest rate; moves with the OCR
    RATE_MIN: 0.04, RATE_MAX: 0.095,
    APPRECIATION: 0.05,        // ~5%/yr market drift (before events)
};

/* ---------------------------------------------------------------- PROPERTIES
   Real 2026 prices & rents. Buy with a deposit; the bank lends the rest.
   deposit = fraction paid in cash.  costRate = holding costs (rates, insurance,
   body corp, mgmt) as a fraction of gross rent.  newBuild = LVR/DTI-exempt. */
const PROPERTIES = [
    { id:'studio', emoji:'🏢', name:'Leasehold CBD Studio', price:130000, rent:340, units:1, mult:1.05,
      deposit:0.35, costRate:0.55, growth:0.01, unlock:0,
      desc:'You don\'t own the land — just the right to pay ground rent on it forever. Cheap for a reason; the body corp is the reason.' },
    { id:'doup', emoji:'🔨', name:'Provincial Do-Up', price:380000, rent:440, units:1, mult:1.06,
      deposit:0.35, costRate:0.30, growth:0.04, unlock:2,
      desc:'An Invercargill three-bed with "loads of potential" and one working power point. Cash-flow positive — nobody else is bidding.' },
    { id:'exState', emoji:'🏚️', name:'Ex–Kāinga Ora State House', price:720000, rent:700, units:1, mult:1.07,
      deposit:0.35, costRate:0.30, growth:0.045, unlock:4,
      desc:'KO\'s offloading ~900 a year since the Bill English review. You bought a public asset and privatised the rent.' },
    { id:'leaky', emoji:'💧', name:'Leaky 3-Flat Block', price:950000, rent:1560, units:3, mult:1.08,
      deposit:0.35, costRate:0.38, growth:0.03, unlock:7,
      desc:'Monolithic cladding, a body corp at war, ~9% off comparable. Three tenancies who won\'t know until it rains indoors. The yield, though.' },
    { id:'auck', emoji:'🏠', name:'Auckland Fringe 3-Bed', price:1050000, rent:760, units:1, mult:1.08,
      deposit:0.35, costRate:0.30, growth:0.055, unlock:10,
      desc:'Bleeds cash every week and you buy it anyway — this one\'s a bet on the capital gain, not the rent. Negative gearing, restored to full tax-deductibility.' },
    { id:'townhouse', emoji:'🏘️', name:'New-Build Townhouse Row', price:2400000, rent:2360, units:4, mult:1.09,
      deposit:0.15, costRate:0.28, growth:0.035, unlock:14, newBuild:true,
      desc:'Four sausage flats where a villa\'s lawn used to be. New build, so the bank waves the deposit AND the DTI limit — 15% down, the rules don\'t apply.' },
    { id:'prestige', emoji:'🥂', name:'Remuera Prestige Land-Bank', price:3600000, rent:1900, units:1, mult:1.10,
      deposit:0.35, costRate:0.30, growth:0.065, unlock:18,
      desc:'A trophy that yields almost nothing and appreciates like a rocket. You\'re not a landlord here, you\'re a land-banker with a tenant for cover.' },
    { id:'block', emoji:'🏢', name:'Entire Apartment Block', price:22000000, rent:26000, units:40, mult:1.12,
      deposit:0.35, costRate:0.30, growth:0.04, unlock:24,
      desc:'You are now the whole building. Forty tenancies call it home; the spreadsheet calls it stock; the RMA replacement calls it "enabled."' },
];

/* ---------------------------------------------------------------- OPERATIONS */
const OPERATIONS = [
    { id:'optimiseRent', emoji:'📈', name:'Optimise Rents', heat:6, needTenants:true,
      desc:'A modest, market-aligned adjustment — even as national rents fall, because your tenants can\'t all move to Brisbane at once. (Also lifts your borrowing power.)',
      rentBoost:0.025, strain:14,
      news:s => `Rents "optimised" while the market drops. Asked how, you cite "costs." Yours. Emotional ones.` },

    { id:'inventFee', emoji:'🧾', name:'Invent a Fee', heat:3, needTenants:true,
      money:(s,m)=> Math.max(3000, grossRentWeekly()*0.9),
      desc:'Letting fees have been illegal since 2018, so this is a "tenancy administration contribution" — which is different, because you renamed it.',
      news:s => { const f=pick(FEES); return `New charge introduced: ${f}. Legally grey, morally charcoal, financially excellent.`; } },

    { id:'ignoreHealthy', emoji:'🦠', name:'Ignore Healthy Homes', heat:9, needTenants:true, heatKey:'compliance',
      money:(s,m)=> s.tenants*300 + 4000, strain:6,
      desc:'Compliance was mandatory for every rental from 1 July 2025. About 18% of rentals are still cold and damp. Be the 18%.',
      news:s => `Healthy Homes deadline treated as a strong suggestion. Mould reclassified as "a natural feature of the character home."` },

    { id:'noCause', emoji:'📜', name:'90-Day No-Cause Eviction', heat:14, needTenants:true, heatKey:'tribunal', infl:4,
      money:(s,m)=> Math.max(8000, grossRentWeekly()*1.5), evicts:true,
      desc:'No-cause terminations came back on 30 Jan 2025 — "open season on renters," said Renters United. No reason required. That\'s the product.',
      news:s => `Tenant requests a repair, receives a 90-day no-cause notice instead. Re-let same day at market. The Minister files it under "supply."` },

    { id:'airbnb', emoji:'🧳', name:'Convert to Airbnb', heat:11, needTenants:true, cost:5000,
      money:(s,m)=> grossRentWeekly()*2.2 + 10000, removesHousehold:true,
      desc:'Housing a tourist three nights beats housing a nurse three years. The maths is the maths — and the maths just left for the Gold Coast.',
      news:s => `Long-term rental flipped to short-stay. A family of four replaced by a bucks\' party from Ballarat. Five stars, would evict again.` },

    { id:'subdivide', emoji:'🚪', name:'Add a Consent-Free Granny Flat', heat:15, needTenants:true, cost:10000,
      rentBoost:0.06, addsUnits:2,
      desc:'Up to 70m² in the backyard, no building or resource consent, since 15 January 2026. Two more households where the Hills Hoist stood.',
      news:s => `Backyard "minor dwelling" erected over a long weekend. Council notified via a form that notifies no one.` },

    { id:'petBond', emoji:'🐕', name:'Demand a Pet Bond', heat:4, needTenants:true,
      money:(s,m)=> s.tenants*110 + 1600,
      desc:'Pet bonds — up to two weeks\' rent — became legal on 1 Dec 2025. You charge it for a goldfish. The goldfish is named as guarantor.',
      news:s => { const p=pick(PETS); return `Two-week pet bond demanded for a ${p}. Legally sound since December. Spiritually, a summons.`; } },

    { id:'bondGrab', emoji:'🔒', name:'Withhold the Bond', heat:5, needTenants:true,
      money:(s,m)=> s.tenants*160 + 2500,
      desc:'Bond\'s capped at four weeks and must be lodged — one landlord was fined $38,713 for "forgetting." You\'ll keep it the honest way: for "carpet."',
      news:s => `Bond retained for "professional cleaning," performed by the next tenant, unpaid, under duress.` },

    { id:'overseas', emoji:'🌏', name:'Sell to a Golden-Visa Buyer', heat:6, infl:8, needProperty:2,
      sell:'market',
      desc:'The foreign-buyer ban was part-lifted in early 2026: Active Investor Plus migrants may buy $5m+ homes. ~40% are Americans wanting a "Plan B." Clears the mortgage and banks any capital gain.',
      news:s => `$5m villa sold to an offshore investor-migrant as a doomsday bunker. It stays dark. Spain scrapped its golden visa over this; we mailed ours a fruit basket.` },

    // Redemption path — appears only while your hands are relatively clean.
    { id:'sellFHB', emoji:'🕊️', name:'Sell to the Tenants (at cost)', heat:-18, sell:'cost', fhb:true,
      needProperty:2, hideIf:s => s.evictions>0 || heatTier().i>=2,
      desc:'Sell a home to the family living in it, for what you paid — forgoing the golden-visa premium. You lose the gain. They lose the fear.',
      news:s => `Landlord sells to sitting tenants at cost. NZPIF calls him "unwell." The tenants call him the best they ever had — a devastating review of everyone else.` },
];

const FEES = [
    '"Tenancy administration contribution" (a letting fee wearing a moustache)',
    '"Healthy Homes compliance levy" (for compliance not performed)',
    '"Winter heat-pump servicing surcharge" (the heat pump does not work)',
    '"Rates recovery fee" (you already deduct the rates)',
    '"Bond lodgement processing fee" (lodging the bond is the law)',
    '"After-hours maintenance surcharge" (there is no maintenance)',
    '"Rent payment convenience fee" (for the convenience of paying rent)',
    '"Body corp pass-through premium" (marked up 20%, obviously)',
];
const PETS = ['goldfish','budgie','hamster','tortoise','cat that visits sometimes','elderly, blameless labrador'];

/* ------------------------------------------------------------------ POLITICS */
const POLITICS = [
    { id:'donate', emoji:'💰', name:'Donate to a Party', political:true,
      cost:(s)=> 8000 + s.lifetimeInfluence*40, infl:30,
      desc:'You give to National for the deregulation, to Labour in case the CGT passes, and to NZ First for the vibes. It\'s not corruption, it\'s diversification.',
      news:s => `${pick(PARTIES)} gratefully accepts your donation, filed under "engaged citizen." A policy you like appears on Thursday, unrelatedly.` },

    { id:'bribe', emoji:'🤝', name:'Grease a Council Consent', political:true,
      cost:(s)=> 12000 + s.lifetimeInfluence*30, infl:45,
      desc:'The RMA replacement isn\'t operative until 2029, so until then a consent still costs eighteen months — or one dinner in Herne Bay.',
      news:s => `Councillor recuses themselves from nothing. Your consent arrives overnight, warm from the photocopier. Democracy: buffering.` },

    { id:'prBlitz', emoji:'🕴️', name:'Reputation Laundering Blitz', political:true, need:{infl:40},
      cost:(s)=> 9000, spendInfl:40, heat:-18,
      desc:'A warm profile drops: "Meet the humble battler who happens to own 40 homes and provides an essential service." NZPIF-approved.',
      news:s => `Op-ed reframes you as a "housing provider under pressure." The pressure is other people\'s rent. It works.` },

    { id:'suppress', emoji:'🗞️', name:'Spike the Story', political:true, need:{infl:80},
      cost:(s)=> 15000, spendInfl:80, heat:-32,
      desc:'That RNZ reporter had the mould, the emails, the pregnant tenant, the rat droppings. Now they have an exciting new role covering the weather in Gore.',
      news:s => `Investigation into your empire "paused pending resourcing." Reporter reassigned to the long-range forecast. It is fine tomorrow.` },

    { id:'weakenLaw', emoji:'⚖️', name:'Submit on the RMA Replacement', political:true, need:{infl:150, phase:2},
      cost:(s)=> 60000, spendInfl:150, permHeatDown:0.85,
      desc:'Why break the rules when you can be "the sector" at select committee? The Planning Bill runs 900 pages; you wrote the good bits.',
      news:s => `Select committee hears from "stakeholders" (you). Tenants hear about it afterwards. Notice periods get shorter; so does the law.` },

    { id:'textMinister', emoji:'📱', name:'Text a Minister Directly', political:true, need:{infl:280},
      cost:(s)=> 90000 + s.lifetimeInfluence*120, spendInfl:200, infl:260,
      desc:'No official channel, no paper trail — just a mate\'s number and "you around?" It worked for that 2024 board appointment nobody was allowed to ask about.',
      news:s => `A Cabinet-level problem resolved by text, in the grand tradition of an appointment that bypassed the usual process entirely.` },

    { id:'board', emoji:'🏛️', name:'Get onto the Kāinga Ora Board', political:true, need:{infl:520, phase:4},
      cost:(s)=> 500000, spendInfl:500, ending:'minister',
      desc:'Bill English reviewed KO and found it "not financially viable." The fix, obviously, is a commercial mind like yours. You are the arson and the insurance claim.',
      news:s => `You are appointed to govern the housing agency you spent years plundering. Poacher, meet gamekeeper; gamekeeper, meet governance stipend.` },
];

const PARTIES = ['National (for the tax cuts)','Labour (hedging the CGT)','ACT (for the red-tape bonfire)','NZ First (for the vibes)','whoever wins on 7 November'];

/* ------------------------------------------------------------------ SERVICES */
/* Two kinds:
   'hire'    — ongoing. You pay a weekly fee (flat retainer, or a commission
               that's a % of your rent roll) for as long as it's engaged, and
               can let them go at any time. Some charge a one-off setup fee.
   'capital' — bought once, yours forever. No weekly drag.
   The real question every card poses: is the overhead worth what it buys me,
   at the size I am right now? A PR firm is dead weight when nobody's watching. */
const SERVICES = [
    { id:'propManager', emoji:'👔', name:'Property Manager', kind:'hire',
      fee:{pctRent:0.09}, signup:6000,
      does:'An agency runs your tenancies and pushes every rent to the ceiling — so the fees are their idea, not yours.',
      live:'Rents +25%', tag:'+25% rent · 9% commission',
      desc:'You never see a tenant again. They invent the charges on your behalf, with a clear conscience they bill you 9% for.' },
    { id:'rentAlgo', emoji:'🤖', name:'Rent-Setting Algorithm', kind:'hire',
      fee:{pctRent:0.06}, signup:20000, need:{phase:1},
      does:'Software sets every rent to the maximum the data allows. No human decides it, so no human is responsible for it.',
      live:'Rents +40%', tag:'+40% rent · 6% subscription',
      desc:'It\'s just the number. The number goes up. You bill it to the tenants and the licence fee to your accountant.' },
    { id:'compliance', emoji:'📋', name:'Healthy Homes "Compliance" Consultant', kind:'hire',
      fee:{flat:700}, signup:5000,
      does:'Signs off the Healthy Homes standards — mandatory since July 2025 — that you are actively ignoring, so inspections bounce off.',
      live:'Ignore-standards heat halved', tag:'Ignore-standards heat ×0.5',
      desc:'They certify your compliance with the rules you break. The folder is thick, professional, and completely fictional.' },
    { id:'accomSupp', emoji:'🏦', name:'Accommodation Supplement Harvester', kind:'hire',
      fee:{pctRent:0.05}, signup:15000, need:{phase:1},
      does:'Structures your rents to vacuum up the Accommodation Supplement — the ~$2b/yr the taxpayer pays on top of the rents you set.',
      live:'+$24 / household / wk', tag:'+$24/household/wk · 5% cut',
      desc:'The state tops up the rents, so you raise the rents. The subsidy lands in your account. Thanks, taxpayer.' },
    { id:'tribunal', emoji:'📚', name:'Tenancy Tribunal Retainer', kind:'hire',
      fee:{flat:1200}, signup:8000,
      does:'A lawyer on retainer fights every Tenancy Tribunal case for you — and usually wins on a technicality.',
      live:'Eviction heat halved', tag:'Eviction heat ×0.5',
      desc:'Renters United built a free tool to fight you (TenancyHelp). You built a lawyer who bills by the comma. Guess who wins.' },
    { id:'astroturf', emoji:'📣', name:'Astroturf "Renters\' Group"', kind:'hire',
      fee:{flat:2200}, signup:15000, need:{phase:2},
      does:'A "grassroots" tenant voice that mysteriously agrees with landlords, quoted in the press whenever you\'re under fire.',
      live:'All scrutiny ×0.75', tag:'All heat ×0.75',
      desc:'The grass is plastic, the roots are yours, and the quarterly press releases write themselves. So does the outrage.' },
    { id:'prFirm', emoji:'📰', name:'PR Crisis Firm on Retainer', kind:'hire',
      fee:{flat:3000}, signup:20000, need:{phase:2},
      does:'A crisis firm on call to kill stories before they run and reframe "slumlord" as "essential service provider."',
      live:'Scrutiny cools fast', tag:'Scrutiny decays fast',
      desc:'The news cycle is three days long. They make sure you outlast it, every time, for a fee that never sleeps.' },
    { id:'lobbyist', emoji:'📞', name:'Lobbyist on Speed-Dial', kind:'hire',
      fee:{flat:4500}, signup:25000, need:{phase:3},
      does:'Turns your problems into policy — while retained, every optimisation you run also earns political influence.',
      live:'+3 influence per optimisation', tag:'Optimisations earn influence',
      desc:'The Planning Bill has your fingerprints, gloved. Idle weeks still cost the retainer — you only profit if you\'re working.' },
    { id:'methKit', emoji:'🧪', name:'Meth-Test Kit (owned)', kind:'capital', cost:90000,
      does:'Meth-test every tenancy, bill the tenant for it, and evict on a reading above 30µg. Yours to keep.',
      live:'+$16 / household / wk', tag:'+$16/household/wk',
      desc:'The new rules (16 Apr 2026) set the "contaminated" line at 15µg. You test constantly, because the test itself is billable.' },
    { id:'trust', emoji:'🏛️', name:'Family Trust Restructure', kind:'capital', cost:1200000, need:{phase:3},
      does:'Move everything into a family trust. Nothing is technically yours, so nothing is technically your fault.',
      live:'Restructure unlocked', tag:'Unlocks Restructure',
      desc:'A one-off legal restructure, done once and permanent. Brightline can\'t see you. Neither, increasingly, can you.' },
];

/* -------------------------------------------------------------------- PHASES */
const PHASES = [
    { min:0,          name:'Generation Rent Refugee' },
    { min:250000,     name:'Mum & Dad Investor' },
    { min:1200000,    name:'Portfolio Landlord' },
    { min:5000000,    name:'Property Mogul' },
    { min:20000000,   name:'Housing Spokesperson' },
    { min:75000000,   name:'Shadow Housing Minister' },
    { min:250000000,  name:'The Minister' },
];

const INFLUENCE_TITLES = [
    { min:0,    name:'Nobody' },
    { min:60,   name:'Local Nuisance' },
    { min:180,  name:'Councillor\'s Contact' },
    { min:400,  name:'Party Donor (Bronze)' },
    { min:800,  name:'NZPIF Life Member' },
    { min:1500, name:'Coalition Whisperer' },
    { min:3000, name:'Kingmaker' },
];

const HEAT_TIERS = [
    { min:0,  key:'calm',    trend:"Nobody's watching",  foot:'The press has bigger fish to fry. Squeeze away.' },
    { min:30, key:'noticed', trend:'A few noticing',      foot:'A Reddit thread. A pointed tweet. Nothing you can\'t outspend.' },
    { min:55, key:'heat',    trend:'Getting warm',        foot:'Journalists are emailing. Inspectors are curious. Tidy up or pay up.' },
    { min:80, key:'crisis',  trend:'🔥 Full exposé risk', foot:'You are a headline waiting to happen. Buy silence — fast.' },
];

/* ------------------------------------------------------------- TENANT PIECES */
// Names are generated with a controlled NZ distribution — clearly Pākehā/European
// majority (~72%), with a coherent minority of Māori, Pasifika, Asian & Indian
// names (kept culturally consistent rather than randomly mashed together).
const EURO_FIRST = ['James','Emma','Jack','Olivia','Liam','Sophie','Ben','Grace','Sam','Ella','Josh','Kate','Ryan','Chloe','Dan','Hannah','Matt','Lucy','Tom','Amy','Connor','Georgia','Zoe','Nathan','Holly','Aaron','Bridget','Scott','Paige','Megan','Luke','Sarah','Mark','Rebecca','Craig','Jess','Pete','Kylie','Shane','Nicola','Wayne','Donna','Bruce','Sharon','Kevin','Ruth','Gary','Steph'];
const EURO_LAST  = ['Smith','Wilson','Taylor','Brown','Walker','Thompson','Wright','Baker','Harris','Clark','Robinson','Scott','Murphy','O\'Brien','Reid','Marsh','Cooper','Bennett','Hughes','Fraser','Ellis','Gray','Doyle','Nolan','Stewart','Webb','Hill','Ward','Watson','Kelly','Moore','Bell','Cox','Fisher','Palmer','Dixon','Barnes','Hayes','Newton','Coleman','Pratt','Sinclair'];
const MAORI_FIRST = ['Aroha','Wiremu','Manaia','Hine','Nikau','Rangi','Tama','Anahera','Moana','Kauri'];
const MAORI_LAST  = ['Ngata','Hohepa','Rewiti','Waititi','Katene','Wetere','Paki','Williams'];
const PASI_FIRST  = ['Sione','Sina','Mele','Fetu','Ana','Talei','Losa'];
const PASI_LAST   = ['Faleolo','Tuilagi','Solomona','Fifita','Vaka','Latu'];
const ASIAN_FIRST = ['Priya','Raj','Mei','Anika','Jun','Wei','Aarav','Sanjay'];
const ASIAN_LAST  = ['Patel','Singh','Kaur','Chen','Nguyen','Kim','Wang','Reddy'];

function makeName(){
    const r = Math.random();
    if (r < 0.72) return pick(EURO_FIRST) + ' ' + pick(EURO_LAST);
    if (r < 0.80) return pick(MAORI_FIRST) + ' ' + pick(Math.random()<0.5 ? MAORI_LAST : EURO_LAST);
    if (r < 0.87) return pick(PASI_FIRST) + ' ' + pick(PASI_LAST);
    if (r < 0.95) return pick(ASIAN_FIRST) + ' ' + pick(ASIAN_LAST);
    return pick(EURO_FIRST) + ' ' + pick(MAORI_LAST.concat(PASI_LAST));   // a few genuinely mixed
}
const T_JOB = [
    'ED nurse, night shifts','Primary school teacher','Supermarket 2IC','Barista + Uber, both',
    'Aged-care worker','Apprentice sparky','Bus driver','Solo mum, two kids','Three uni students (a "flat")',
    'Warehouse picker','Chef, 55-hr weeks','Palliative care nurse','Call-centre team','Retail, zero-hours',
    'Council parks crew','Beneficiary + part-time','Truckie, long-haul','Kōhanga reo kaiako','Early-childhood teacher',
];
const T_SITUATION = [
    'Their flatmate left for Brisbane; now they cover the whole rent alone.',
    'Rents are "falling" nationwide — somehow not here. Still cold, still damp.',
    'On the Kāinga Ora "Priority One" list for three years. Their number is still four digits.',
    'The Winter Energy Payment lasts nine days. One lounge heat pump does the rest, poorly.',
    'Lives in a "consent-free minor dwelling" — a shed with ambitions and a power bill.',
    'Heat pump died in June. You replied in spring: "have you tried the Winter Energy Payment?"',
    'Third flat in two years. Every landlord "needed it for family."',
    'Charged a "tenancy administration contribution." That\'s a letting fee. Those are illegal. Apparently it\'s "admin."',
    'The kids share a room with the dehumidifier. It has the best mattress.',
    'Applied against 40 others for this damp one-bed and "won." The prize is the damp one-bed.',
    'The bank lends them 6× income for a house that costs 11×. The gap is officially called "patience."',
    'Paid a two-week pet bond for a budgie. The budgie now has stronger tenancy rights than they do.',
    'Wrote you a lovely email about the mould. You screenshotted it to your accountant.',
    'Priced out to Papakura; commutes 90 minutes each way to the job still stuck in town.',
    'Keeps the oven on with the door open for warmth. Cheaper than the heat pump you won\'t fix.',
    'Saved a deposit for six years. The market saved harder.',
    'Every inspection, they tidy for a stranger who notes "tenant appears to live here."',
    'Splits a two-bed with three others found in a Facebook group called "Wellington Rooms."',
    'The landlord\'s LinkedIn says "providing homes for Kiwis." Their bathroom says otherwise.',
    'Asked, politely, for the mould to be fixed. Got a rent review instead.',
    'Works two jobs to make rent on a flat with one working power point.',
    'The letting agent called it "cosy." The thermometer calls it "a fridge."',
    'Moved cities for cheaper rent. The rent followed, like a debt with a car.',
    'Their bond has been "under review" for five months. So has their patience.',
    'Told the flat was "warm and dry." It is legally required to be neither.',
    'Puts a towel under the door to keep the draught out and the damp in.',
    '"So lucky to get" a garage conversion with a curtain for a fourth wall.',
    'Rent went up again. Wages sent their apologies.',
];

/* ------------------------------------------------------------------- HEADLINES */
const HEADLINES = [
    'OCR hiked to 2.50% — after six straight cuts — because petrol sneezed. First-home buyers, told last month the coast was clear, quietly sit back down.',
    'Rents fall a second month. Economists cheer. Reason: everyone\'s flatmate moved to Brisbane, where the rent is also unpayable but the wages aren\'t a dare.',
    'Finance Minister says social-housing tenants have "won the Lotto." Later regrets "reaching for the wrong metaphor" — not, notably, the policy.',
    'Investigation finds government MPs bought 25 more rentals AFTER passing pro-landlord reforms. MPs describe this as "believing in the asset class."',
    'Granny flats up to 70m² now consent-free. Backyards nationwide sprout "minor dwellings"; the lawn is declared a failed asset.',
    'Kāinga Ora, found "not financially viable," sells another 900 state homes. The waitlist, unbothered, remains four digits.',
    'Foreign-buyer ban part-lifted: golden-visa migrants may buy $5m+ homes. ~40% are Americans buying a "Plan B." Locals keep buying "a flat, eventually, maybe."',
    'Median house price $770k — still 18% below the 2021 bubble. Buyers praised for their "patience," i.e. their continued inability to afford anything.',
    'DTI rules let an investor borrow 7× income and count 78% of the rent; a first-home buyer gets 6× and counts none. The system, working as designed.',
    'Bank stress-tests a nurse at 7% on 6× her income, then declines her. It approves your fourth rental before lunch. She was bidding on the same house.',
    'New-build townhouses are exempt from the deposit AND the debt limits. Investors discover a deep, sudden passion for "supply."',
    'CPI back to 4.1%, above the band, on a 27% petrol spike. RBNZ spent 18 months cutting rates to save borrowers, then undoes it in one meeting.',
    'Dunedin students move into a flat with "vomit up the walls and buckets on the lawn." Landlord keeps the $2,400 bond, offers no reason, cites no law (there is one).',
    'No-cause 90-day evictions, restored last year, described by landlords as "essential" — and by 8.2% of them as something they would "actually use."',
    'Pet bonds now legal. Landlord charges two weeks\' rent for a goldfish. The goldfish is listed as co-signer.',
    'Accommodation Supplement tips over $2 billion a year. A review finds it mostly reaches landlords, who call this "working as intended."',
    'Election set for 7 November. Cost of living and housing top every poll; every party vows to fix it; the houses remain exactly where they are.',
    'Labour campaigns on a 28% capital gains tax (not the family home). Property investors discover a sudden, profound interest in "the family home."',
    'Greens call it a "cost of greed crisis" and propose rent controls. The landlord lobby warns the market "would be destroyed" — a market it also describes as thriving.',
    'Interest deductibility fully restored for landlords; net investor buying intentions hit a decade high. "Anyone can do this," says a man doing it with tax breaks.',
    'Leasehold apartment listed for $1. The ground rent and body corp are $14k a year. It is, technically, still overpriced.',
    'A "leaky" home sells 9% under comparable. The buyer plans to rent it out as-is. It is raining. Inside.',
    'RMA to be replaced by two bills totalling 900 pages "to cut red tape." Consultants report record demand for help understanding the red-tape reduction.',
    'Housing Minister concedes a social-rent hike was based on "no particular science," just what felt "appropriate." Tenants confirm it feels like a lot.',
    'Net 37,000 citizens leave for good; 63% pick Australia. The population still grows — new arrivals fill the seats still warm from the Brisbane flight.',
    'UK bans no-fault evictions in May; Ireland has 1,777 rentals in the entire country. NZ, surveying the field, restores no-fault evictions.',
    'Cheapest one-year fixed now 4.65%. "Refix anxiety" enters the vernacular. Landlords forward the cost to tenants and the blame to the RBNZ.',
    'OneRoof declares "the death of the Kiwi do-up": buy ugly, not broken. The broken ones, naturally, become rentals.',
    'Investor seminar sells out: "Leverage Their Rent Into Your Sixth House." The nurse in row six is here by mistake; she thought it was a job fair.',
    'Landlord lists a "sunny" flat facing a brick wall. Pressed, he confirms the sun does technically exist.',
    'Heat pump fixed after 14 months. Tenant billed a "responsiveness surcharge" for the reminder emails.',
    'Property manager inspects a flat and notes "tenant appears to live here." Recommends a rent review.',
    'First-home buyer saves a 20% deposit. The house goes up 21%. She is congratulated for "nearly making it."',
    'Investor buys his childhood home and rents it back to the family that raised him. Calls it "keeping it local."',
    'Council debates housing density for six hours, then votes to form a working group to schedule a consultation.',
    'The bank approves a landlord\'s ninth mortgage in the time it takes a renter to be declined for a one-year lease.',
    'Rent bidding, banned in 2021, quietly returns as "voluntary generosity above the advertised price."',
    'Wellington flat advertised "partly furnished." The part is one chair, facing the mould, like a therapist.',
    'Emergency-housing motel hits capacity. The quarterly update celebrates "strong occupancy."',
    'Landlord raises the rent to "match the market." The market is a group chat of four other landlords.',
    'New townhouse block sells out in a weekend — zero to owner-occupiers, all to "the sector," warmly.',
    'Study links cold rentals to hospital admissions. Landlords cite it as proof tenants should "wear more."',
    'Tenant requests curtains. Landlord installs "a privacy expectation" instead.',
    'Auckland median dips under $1m for a week. Property pages declare a "once-in-a-lifetime window," for the ninth time.',
    'Retiree with three rentals tells breakfast TV that young people should "give up brunch." The house costs 400,000 brunches.',
    'Body-corporate fees rise 30%. The body corporate is one man named Trevor, a clipboard, and a grievance.',
    'Periodic tenancy ended for "renovations." The same flat is re-listed a week later, unrenovated, +$120.',
    'Bond returned after seven months, minus a deduction for a mark "already there." The photos are dismissed as "lighting."',
    'The Reserve Bank warns of "investor exuberance." Investors, exuberant, buy the warning and rent it out.',
    'Open home draws a queue around the block for a single bedroom. The listing calls the queue "a vibrant community."',
    'Renter with a perfect record loses the flat to the owner\'s nephew, who needed somewhere "just for a bit."',
];

/* pick a headline that hasn't shown in the last ~14, so repeats stay rare */
let _recentNews = [];
function pickHeadline(){
    let h, tries = 0;
    do { h = pick(HEADLINES); tries++; } while (_recentNews.indexOf(h) !== -1 && tries < 24);
    _recentNews.push(h);
    if (_recentNews.length > 14) _recentNews.shift();
    return h;
}

/* ----------------------------------------------------------------------- ADS
   "Sponsored" fake brands — GTA-flavoured flat posters, but NZ-housing real.
   Rotate in a banner and occasionally drop into the news feed. */
const ADS = [
    { logo:'🏦', brand:'EquityMate Home Loans', hue:'teal',
      tagline:'7× your income. 0× your chances.', fine:'You will never own this home. Fees apply, as does gravity.' },
    { logo:'🧪', brand:'Meth-B-Gone™', hue:'green',
      tagline:'We test. We find. You bill the tenant.', fine:'Positive in 3 seconds, results in 3 weeks, bond withheld either way.' },
    { logo:'💳', brand:'AfterYay', hue:'coral',
      tagline:'Buy your bond now, panic in 4 easy instalments.', fine:'Missed a payment? So did your landlord — on the maintenance.' },
    { logo:'🛎️', brand:'Air-Boomer B&B', hue:'amber',
      tagline:'Superhost your nan\'s third investment property.', fine:'A nurse used to live here. Now: a stag do from Ballarat.' },
    { logo:'📈', brand:'Bright-Line Flippers', hue:'plum',
      tagline:'Buy it, hold it 24 months, flip it tax-free.', fine:'Housing is a sport now. No losers — except the players.' },
    { logo:'🏚️', brand:'Kāinga Ora Clearance', hue:'red',
      tagline:'State homes. Everything must go. 40% off.', fine:'To approved mates only. The waitlist is not invited.' },
    { logo:'🌡️', brand:'Cosy Kiwi Rentals', hue:'teal',
      tagline:'"Warm & Dry."*', fine:'*Not warm. Not dry. Legally required to imply otherwise.' },
    { logo:'🐎', brand:'Winston’s Racing Syndicate', hue:'amber',
      tagline:'Invest in a horse, receive a housing policy.', fine:'The horse has better odds than a first-home buyer.' },
    { logo:'🔨', brand:'The Do-Up Academy', hue:'coral',
      tagline:'Retire on their rent. Deductibility is back, baby.', fine:'Seminar $499. The knowledge is free; the confidence, priceless.' },
    { logo:'📱', brand:'Trade-Moi Property+', hue:'green',
      tagline:'Outbid a nurse from the comfort of your phone.', fine:'47 others are watching this listing. One is a bot. Two are you.' },
    { logo:'⚖️', brand:'Loophole & Sons, Consents', hue:'plum',
      tagline:'The RMA is 900 pages. We’ve read the good bits.', fine:'Your dinner in Herne Bay is 100% deductible. So is our silence.' },
    { logo:'✈️', brand:'Brisbane Departures Ltd', hue:'red',
      tagline:'Same rent. Wages that aren’t a dare.', fine:'Everyone you know is already on the 6am flight. Window seat?' },
];

/* --------------------------------------------------------------------- STATE */
let state;

function defaultState() {
    const props = {};
    // deBasis = de-indexed cost basis: price paid ÷ marketIndex-at-purchase. A unit's
    // current value is deBasis × marketIndex, so a just-bought unit is worth what you
    // paid (no instant gain) and only appreciates as the index climbs after purchase.
    PROPERTIES.forEach(p => props[p.id] = { count: 0, cost: p.price, deBasis: 0 });
    return {
        v: 3,
        money: CFG.START_CASH,
        debt: 0,               // total mortgage owed
        dtiDebt: 0,            // debt that counts against the DTI cap (excludes new-build)
        marketIndex: 1,        // property values drift up with this over time
        rate: CFG.MORTGAGE_RATE,
        heat: 0,
        influence: 0,
        lifetimeInfluence: 0,
        rentMultBonus: 0,
        extraUnits: 0,
        legacy: 0,
        permHeatMult: 1,
        properties: props,
        upgrades: {},
        onceUsed: {},
        tenants: 0,
        featured: [],
        speed: CFG.DEFAULT_SPEED,
        buyQty: 1,
        lastUpdate: now(),
        _lastDilemma: now()/1000,   // grace period before the first dilemma (also avoids epoch instant-fire)
        weekFrac: 0,
        muted: false,
        evictions: 0, rentRaises: 0, violations: 0, bribes: 0,
        feesInvented: 0, fhbSales: 0, heatMaxStreak: 0, ended: false,
        achievements: {},          // id -> true (Rap Sheet)
        dossier: 0,                // the reporter's investigation, 0–100
        _dossierChapter: 0,        // which escalation beat she's reached
        unlocked: { portfolio: true },  // progressive disclosure of tabs/systems
    };
}

/* ------------------------------------------------------------------- HELPERS */
function now(){ return Date.now(); }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
function $(id){ return document.getElementById(id); }

function fmt(n){
    n = Math.floor(n);
    const neg = n < 0; n = Math.abs(n);
    let s;
    if (n >= 1e9) s = (n/1e9).toFixed(2).replace(/\.00$/,'') + 'b';
    else if (n >= 1e6) s = (n/1e6).toFixed(2).replace(/\.00$/,'') + 'm';
    else s = n.toLocaleString('en-NZ');
    return (neg?'-':'') + s;
}
function money(n){ return '$' + fmt(n); }

/* ---------------------------------------------------------- DERIVED / GETTERS */
function multipliers(){
    const u = state.upgrades;
    return {
        rent: (1 + state.rentMultBonus)
              * (u.propManager ? 1.25 : 1)
              * (u.rentAlgo ? 1.40 : 1)
              * (1 + state.legacy * CFG.LEGACY_BONUS),
        heatGen: (u.astroturf ? 0.75 : 1) * state.permHeatMult,
        heatDecay: CFG.BASE_HEAT_DECAY + (u.prFirm ? 5 : 0) + (u.astroturf ? 0.8 : 0),
        passivePerTenant: (u.methKit ? 16 : 0) + (u.accomSupp ? 24 : 0),
        inflPerOp: u.lobbyist ? 3 : 0,
    };
}

function baseTenants(){
    let n = state.extraUnits;
    PROPERTIES.forEach(p => n += state.properties[p.id].count * p.units);
    return Math.max(0, n);
}
function baseTenantsFromProps(){
    let n = 0; PROPERTIES.forEach(p => n += state.properties[p.id].count * p.units); return n;
}

/* gross weekly rent roll (before costs & interest) — used to scale ops */
function grossRentWeekly(){
    const m = multipliers();
    let rent = 0;
    PROPERTIES.forEach(p => rent += state.properties[p.id].count * p.rent);
    rent *= m.rent;
    rent += state.tenants * m.passivePerTenant;
    return Math.max(0, rent);
}

function operatingWeekly(){
    const m = multipliers();
    let op = 0;
    PROPERTIES.forEach(p => op += state.properties[p.id].count * p.rent * (1 - p.costRate));
    op *= m.rent;
    op += state.tenants * m.passivePerTenant;
    return op;
}
function interestWeekly(){ return state.debt * state.rate / 52; }

/* ongoing weekly cost of every 'hire' service you currently have engaged */
function serviceFee(sv){
    if (!sv || !sv.fee) return 0;
    if (sv.fee.flat)    return sv.fee.flat;
    if (sv.fee.pctRent) return grossRentWeekly() * sv.fee.pctRent;
    return 0;
}
function servicesWeekly(){
    let f = 0;
    SERVICES.forEach(sv=>{ if (sv.kind === 'hire' && state.upgrades[sv.id]) f += serviceFee(sv); });
    return f;
}
function feeLabel(sv){
    if (sv.kind === 'capital') return 'One-off · ' + money(sv.cost);
    if (sv.fee && sv.fee.flat)    return money(sv.fee.flat) + '/wk';
    if (sv.fee && sv.fee.pctRent) return Math.round(sv.fee.pctRent*100) + '% of rent · ' + money(serviceFee(sv)) + '/wk';
    return '';
}

/* actual money-in-the-bank change per week (can be negative — negative gearing) */
function netCashflow(){ return operatingWeekly() - interestWeekly() - servicesWeekly(); }

function assessableIncome(){ return CFG.BASE_INCOME + CFG.RENT_SHADE * grossRentWeekly() * 52; }
function maxDebtDTI(){ return CFG.DTI * assessableIncome(); }
function dtiHeadroom(){ return Math.max(0, maxDebtDTI() - state.dtiDebt); }

function portfolioValue(){
    let de = 0;
    PROPERTIES.forEach(p => de += state.properties[p.id].deBasis);
    return de * state.marketIndex;
}
function equity(){ return portfolioValue() - state.debt; }
function netWorth(){ return state.money + equity(); }

/* how much more the bank will advance right now (DTI ∧ LVR) */
function borrowable(){
    const byDti = maxDebtDTI() - state.dtiDebt;
    const byLvr = CFG.LVR_CAP * portfolioValue() - state.debt;
    return Math.max(0, Math.min(byDti, byLvr));
}

function propertyCount(){
    let n = 0; PROPERTIES.forEach(p => n += state.properties[p.id].count); return n;
}

function phaseInfo(){
    let ph = PHASES[0], idx = 0;
    const w = netWorth();
    PHASES.forEach((p,i)=>{ if (w >= p.min){ ph = p; idx = i; } });
    return { name: ph.name, i: idx };
}
function influenceTitle(){
    let t = INFLUENCE_TITLES[0];
    INFLUENCE_TITLES.forEach(x=>{ if (state.lifetimeInfluence >= x.min) t = x; });
    return t.name;
}
function heatTier(){
    let t = HEAT_TIERS[0], i = 0;
    HEAT_TIERS.forEach((x,idx)=>{ if (state.heat >= x.min){ t = x; i = idx; } });
    return { ...t, i };
}
function unlockedTierCount(){
    const c = propertyCount();
    return PROPERTIES.filter(p => c >= p.unlock).length;
}

/* per-unit weekly net cashflow of a property type (for the card display) */
function unitNet(p){
    const m = multipliers();
    const op = p.rent * (1 - p.costRate) * m.rent;
    const interest = (p.price * (1 - p.deposit)) * state.rate / 52;
    return op - interest;
}

/* bulk-buy planning: prices are fixed, so compute the affordable count directly
   (gated by cash for the deposit and — for non-new-builds — the DTI headroom). */
function plannedBuy(prop){
    const price = prop.price;
    const dep = Math.floor(price * prop.deposit);
    const loan = price - dep;
    const cap = state.buyQty === 'max' ? 500 : state.buyQty;   // hard cap per click
    let n = Math.min(cap, dep > 0 ? Math.floor(state.money / dep) : cap);
    if (!prop.newBuild) n = Math.min(n, loan > 0 ? Math.floor(dtiHeadroom() / loan) : n);
    n = Math.max(0, n);
    return { n, deposit: n * dep, loan: n * loan, priceEach: price };
}
function buyBlockReason(prop){
    const st = state.properties[prop.id];
    const dep = Math.floor(st.cost * prop.deposit);
    const loan = st.cost - dep;
    if (state.money < dep) return `Need ${money(dep)} deposit`;
    if (!prop.newBuild && loan > dtiHeadroom()) return `Bank won't lend — raise your income`;
    return null;
}

/* ============================================================ SAVE / LOAD */
function saveGame(silent){
    try {
        state.lastUpdate = now();
        localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(state));
        if (!silent) toast('Empire saved. Preserved for the tribunal.', 'good');
    } catch(e){}
}
function loadGame(){
    const raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw){ state = defaultState(); return false; }
    try {
        const loaded = JSON.parse(raw);
        const savedV = loaded.v || 0;
        state = Object.assign(defaultState(), loaded);
        state.upgrades = state.upgrades || {};
        state.onceUsed = state.onceUsed || {};
        state.featured = state.featured || [];
        state.achievements = state.achievements || {};
        if (typeof state.dossier !== 'number') state.dossier = 0;
        if (typeof state._dossierChapter !== 'number') state._dossierChapter = 0;
        state.unlocked = state.unlocked || { portfolio: true };
        state.unlocked.portfolio = true;
        if (!state.marketIndex) state.marketIndex = 1;
        PROPERTIES.forEach(p => {
            const st = state.properties[p.id] || (state.properties[p.id] = { count:0, cost:p.price, deBasis:0 });
            st.cost = p.price;                       // prices are fixed — heal any legacy escalated value
            if (typeof st.count !== 'number') st.count = 0;
            // migrate legacy saves (old global `basis`, no per-type deBasis): value existing
            // holdings at count×price so net worth is continuous across the upgrade
            if (typeof st.deBasis !== 'number') st.deBasis = st.count * p.price;
        });
        if (typeof state.dtiDebt !== 'number') state.dtiDebt = state.debt || 0;
        delete state.basis;                          // superseded by per-type deBasis
        if (!state.buyQty) state.buyQty = 1;
        if (!state.rate) state.rate = CFG.MORTGAGE_RATE;
        // v<3: Services became weekly hires. Clear any pre-existing hire flags so a legacy
        // save isn't silently billed retainers it never agreed to (which could even tip it
        // straight into the collapse ending on load). The player re-engages at will.
        if (savedV < 3){
            ['propManager','rentAlgo','compliance','accomSupp','tribunal','astroturf','prFirm','lobbyist']
                .forEach(id => delete state.upgrades[id]);
        }
        state.v = 3;
        return true;
    } catch(e){ state = defaultState(); return false; }
}
function offlineProgress(){
    if (state.speed === 0 || state.ended) return;   // paused (or finished) means time stopped
    const elapsed = (now() - (state.lastUpdate || now())) / 1000;
    if (elapsed < 30) return;
    const capped = Math.min(elapsed, CFG.OFFLINE_CAP_HOURS * 3600);
    const weeks = capped / CFG.DEFAULT_SPEED;
    const flow = netCashflow();
    const earned = flow > 0 ? flow * weeks : 0;   // don't bankrupt you while away
    state.marketIndex *= Math.pow(1 + CFG.APPRECIATION/52, weeks);
    state.heat = clamp(state.heat - multipliers().heatDecay * weeks, 0, CFG.HEAT_MAX);
    if (earned > 1){
        state.money += earned;
        setTimeout(()=> modalOffline(earned, capped/3600), 400);
    }
}

/* =============================================================== RENDERING */
const updaters = [];

function buildAll(){
    updaters.length = 0;
    buildProperties();
    buildOperations();
    buildServices();
    buildPolitics();
    renderTenants();
    renderNews(true);
}

function buildProperties(){
    const list = $('properties-list');
    list.innerHTML = '';
    PROPERTIES.forEach(p=>{
        const card = document.createElement('div');
        card.className = 'buy-card';
        card.innerHTML = `
            <div class="buy-card-head">
                <span class="buy-title"><span class="buy-emoji">${p.emoji}</span> ${p.name}${p.newBuild?' <span class="nb-badge">NEW BUILD</span>':''}</span>
                <span class="buy-count" data-count>Owned 0</span>
            </div>
            <div class="buy-desc">${p.desc}</div>
            <div class="buy-stats">
                <span>Price <b data-price></b></span>
                <span>Deposit <b data-dep></b></span>
                <span>Net <b data-net></b>/wk</span>
                <span>+<b>${p.units}</b> hh</span>
            </div>
            <div class="lock-note" data-lock hidden></div>
            <button class="buy-btn" data-buy>Buy</button>`;
        list.appendChild(card);
        const btn = card.querySelector('[data-buy]');
        btn.addEventListener('click', (e)=> buyProperty(p.id, e));

        updaters.push(()=>{
            const st = state.properties[p.id];
            const unlocked = propertyCount() >= p.unlock;
            card.classList.toggle('locked', !unlocked);
            card.querySelector('[data-count]').textContent = 'Owned ' + st.count;
            card.querySelector('[data-price]').textContent = money(st.cost);
            card.querySelector('[data-dep]').textContent = money(Math.floor(st.cost * p.deposit));
            const net = unitNet(p);
            const netEl = card.querySelector('[data-net]');
            netEl.textContent = (net<0?'−':'+') + money(Math.abs(net));
            netEl.className = net < 0 ? 'cf-neg' : 'cf-pos';
            const lock = card.querySelector('[data-lock]');
            if (!unlocked){
                lock.hidden = false;
                lock.textContent = `🔒 Unlocks at ${p.unlock} properties owned`;
                btn.disabled = true; btn.textContent = 'Locked';
                return;
            }
            lock.hidden = true;
            const plan = plannedBuy(p);
            if (state.buyQty === 'max'){
                btn.disabled = plan.n < 1;
                btn.textContent = plan.n >= 1 ? `Buy ×${plan.n} — ${money(plan.deposit)} down` : (buyBlockReason(p) || 'Unavailable');
            } else {
                const ok = plan.n >= state.buyQty;
                btn.disabled = !ok;
                btn.textContent = ok ? `Buy ×${state.buyQty} — ${money(plan.deposit)} down` : (buyBlockReason(p) || 'Unavailable');
            }
        });
    });
}

function buildOperations(){
    const list = $('operations-list');
    list.innerHTML = '';
    OPERATIONS.forEach(op=>{
        const btn = document.createElement('button');
        btn.className = 'action-btn';
        btn.innerHTML = `
            <span class="action-name">${op.emoji} ${op.name}</span>
            <span class="action-desc">${op.desc}</span>
            <span class="action-tags" data-tags></span>`;
        list.appendChild(btn);
        btn.addEventListener('click', (e)=> doOperation(op, e));
        updaters.push(()=>{
            if (op.hideIf && op.hideIf(state)){ btn.style.display = 'none'; return; }
            btn.style.display = '';
            btn.querySelector('[data-tags]').innerHTML = opTags(op);
            btn.disabled = !opAvailable(op);
        });
    });
}
function opTags(op){
    const t = [];
    if (op.cost) t.push(`<span class="tag cost">−${money(op.cost)}</span>`);
    if (op.money){ const v = op.money(state, multipliers()); if (v) t.push(`<span class="tag ${v<0?'cost':'money'}">${v<0?'−':'+'}${money(Math.abs(v))}</span>`); }
    if (op.rentBoost) t.push(`<span class="tag money">+${Math.round(op.rentBoost*100)}% rent</span>`);
    if (op.sell) t.push(`<span class="tag money">${op.sell==='cost'?'sell at cost':'sell → cash'}</span>`);
    if (op.heat) t.push(`<span class="tag ${op.heat<0?'money':'heat'}">${op.heat<0?'':'+'}${op.heat} heat</span>`);
    if (op.infl) t.push(`<span class="tag infl">+${op.infl} infl</span>`);
    return t.join('');
}
function opAvailable(op){
    if (op.needTenants && state.tenants <= 0) return false;
    if (op.needProperty && propertyCount() < op.needProperty) return false;
    if (op.cost && state.money < op.cost) return false;
    return true;
}

function buildServices(){
    const list = $('services-list');
    list.innerHTML = '';
    SERVICES.forEach(sv=>{
        const card = document.createElement('div');
        card.className = 'buy-card svc-card';
        const kindTag = sv.kind === 'capital' ? 'Buy once' : 'Weekly hire';
        card.innerHTML = `
            <div class="buy-card-head">
                <span class="buy-title"><span class="buy-emoji">${sv.emoji}</span> ${sv.name}</span>
                <span class="svc-cost" data-cost></span>
            </div>
            <div class="svc-lines">
                <div class="svc-line"><span class="svc-k">Does</span><span class="svc-v">${sv.does}</span></div>
                <div class="svc-line"><span class="svc-k">Now</span><span class="svc-v" data-now>—</span></div>
            </div>
            <div class="buy-desc small">${sv.desc}</div>
            <div class="lock-note" data-lock hidden></div>
            <div class="svc-foot">
                <span class="svc-kind">${kindTag}</span>
                <button class="buy-btn" data-buy>…</button>
            </div>`;
        list.appendChild(card);
        const btn  = card.querySelector('[data-buy]');
        const cost = card.querySelector('[data-cost]');
        const nowEl = card.querySelector('[data-now]');
        const lock = card.querySelector('[data-lock]');
        btn.addEventListener('click', (e)=> buyService(sv, e));
        updaters.push(()=>{
            const owned = !!state.upgrades[sv.id];
            const gate = meetsNeed(sv.need);
            card.classList.toggle('owned-service', owned);
            cost.textContent = feeLabel(sv);

            // "Now" line: the live effect when engaged, otherwise what it would do
            if (owned){
                nowEl.textContent = sv.kind === 'hire'
                    ? `✓ ${sv.live} · costing ${money(serviceFee(sv))}/wk`
                    : `✓ ${sv.live}`;
                nowEl.classList.add('on');
            } else {
                nowEl.textContent = sv.tag;
                nowEl.classList.remove('on');
            }

            if (!gate.ok && !owned){
                card.classList.add('locked'); lock.hidden = false; lock.textContent = '🔒 ' + gate.why;
                btn.className = 'buy-btn'; btn.disabled = true; btn.textContent = 'Locked';
                return;
            }
            card.classList.remove('locked'); lock.hidden = true;

            if (sv.kind === 'capital'){
                if (owned){ btn.className = 'buy-btn owned'; btn.disabled = true; btn.textContent = '✓ Owned'; }
                else { btn.className = 'buy-btn'; btn.disabled = state.money < sv.cost; btn.textContent = `Buy — ${money(sv.cost)}`; }
            } else if (owned){
                btn.className = 'buy-btn cancel'; btn.disabled = false; btn.textContent = 'Let go';
            } else {
                btn.className = 'buy-btn'; btn.disabled = state.money < (sv.signup||0);
                btn.textContent = sv.signup ? `Engage · ${money(sv.signup)} setup` : 'Engage';
            }
        });
    });
}

function buildPolitics(){
    const list = $('politics-list');
    list.innerHTML = '';
    POLITICS.forEach(pa=>{
        const btn = document.createElement('button');
        btn.className = 'action-btn political';
        btn.innerHTML = `
            <span class="action-name">${pa.emoji} ${pa.name}</span>
            <span class="action-desc">${pa.desc}</span>
            <span class="action-tags" data-tags></span>`;
        list.appendChild(btn);
        btn.addEventListener('click', (e)=> doPolitics(pa, e));
        updaters.push(()=>{
            if (pa.once && state.onceUsed[pa.id]){ btn.style.display='none'; return; }
            btn.style.display = '';
            const cost = pa.cost(state);
            const tags = [`<span class="tag cost">−${money(cost)}</span>`];
            if (pa.spendInfl) tags.push(`<span class="tag infl">−${pa.spendInfl} infl</span>`);
            if (pa.infl) tags.push(`<span class="tag infl">+${pa.infl} infl</span>`);
            if (pa.heat) tags.push(`<span class="tag money">${pa.heat} heat</span>`);
            if (pa.permHeatDown) tags.push(`<span class="tag money">−15% future heat</span>`);
            if (pa.ending) tags.push(`<span class="tag lock">WIN CONDITION</span>`);
            const gate = meetsNeed(pa.need);
            if (!gate.ok) tags.push(`<span class="tag lock">🔒 ${gate.why}</span>`);
            btn.querySelector('[data-tags]').innerHTML = tags.join('');
            const afford = state.money >= cost && (!pa.spendInfl || state.influence >= pa.spendInfl);
            btn.disabled = !gate.ok || !afford;
        });
    });
}
function meetsNeed(need){
    if (!need) return { ok:true };
    if (need.phase && phaseInfo().i < need.phase) return { ok:false, why:`Requires ${PHASES[need.phase].name}` };
    if (need.infl && state.influence < need.infl) return { ok:false, why:`Requires ${need.infl} influence on hand` };
    return { ok:true };
}

/* ---- Tenants ---- */
/* Slots currently mid-departure: idx -> {title,name,job}. Module-scoped and
   deliberately NOT part of `state`, so it's never saved (a persisted overlay
   would have no timer to clear it) and resets cleanly on reload. Rendering the
   overlay from here means any re-render — a sibling exit, a property purchase,
   a refresh — repaints in-progress departures instead of wiping them. */
let _leaving = {};
function makeTenant(){
    const name = makeName();
    const rent = 420 + Math.floor(Math.random()*10)*35;
    const used = (state.featured||[]).map(t=>t && t.situation);
    let sit, tries = 0;
    do { sit = pick(T_SITUATION); tries++; } while (used.indexOf(sit) !== -1 && tries < 12);
    return { name, job:pick(T_JOB), rent, strain: 12 + Math.floor(Math.random()*16), situation: sit, emoji: pick(['🧑','👩','👨','🧑‍🦱','👵','👨‍🦰','🧕','👩‍🦰','🧑‍🦳','👴']) };
}
function syncTenants(){
    state.tenants = baseTenants();
    const want = state.tenants > 0 ? Math.min(4, Math.max(1, Math.ceil(state.tenants/3))) : 0;
    let changed = false;
    while (state.featured.length < want){ state.featured.push(makeTenant()); changed = true; }
    while (state.featured.length > want){ state.featured.pop(); changed = true; }
    return changed;
}
function renderTenants(){
    const wrap = $('tenant-cards');
    $('tenant-total').textContent = `(${fmt(state.tenants)} household${state.tenants===1?'':'s'})`;
    if (state.featured.length === 0){
        wrap.innerHTML = '<div class="empty-note">Buy a property to acquire your first tenants.</div>';
        return;
    }
    wrap.innerHTML = '';
    state.featured.forEach((t, idx)=>{
        const card = document.createElement('div');
        card.className = 'tenant-card';
        card.innerHTML = `
            <div class="tenant-top">
                <div class="tenant-avatar">${t.emoji}</div>
                <div>
                    <div class="tenant-name">${t.name}</div>
                    <div class="tenant-job">${t.job}</div>
                </div>
            </div>
            <div class="tenant-situation">${t.situation}</div>
            <div class="tenant-rent">Rent <span class="rent-num">${money(t.rent)}/wk</span></div>
            <div class="strain-row"><span class="strain-cap">Can they afford it?</span><span class="strain-label" data-strainlabel></span></div>
            <div class="strain-meter"><div class="strain-fill" data-strain></div></div>
            <button class="tenant-btn" data-squeeze>Raise the rent 💢</button>`;
        wrap.appendChild(card);
        card.querySelector('[data-squeeze]').addEventListener('click', (e)=> squeezeTenant(idx, e));
        card.querySelector('[data-strain]').style.width = clamp(t.strain,0,100) + '%';
        card.querySelector('[data-strainlabel]').textContent = strainWord(t.strain);
        const L = _leaving[idx];
        if (L){
            card.classList.add('left');
            const ov = document.createElement('div');
            ov.className = 'tenant-gone';
            ov.innerHTML = `<div class="gone-title">${L.title}</div><div class="gone-name">${L.name} moved out</div><div class="gone-sub">${L.job}</div>`;
            card.appendChild(ov);
        }
    });
}
function updateTenantStrain(){
    const cards = $('tenant-cards').querySelectorAll('.tenant-card');
    cards.forEach((c, i)=>{
        const t = state.featured[i]; if (!t) return;
        if (c.classList.contains('left')) return;   // a departing tenant's card is mid-animation
        const bar = c.querySelector('[data-strain]');
        if (bar) bar.style.width = clamp(t.strain,0,100) + '%';
        const lbl = c.querySelector('[data-strainlabel]');
        if (lbl) lbl.textContent = strainWord(t.strain);
        const btn = c.querySelector('[data-squeeze]');
        if (btn){
            const near = t.strain >= 74;
            btn.classList.toggle('danger', near);
            btn.textContent = near ? '⚠ Push it anyway' : 'Raise the rent 💢';
        }
    });
}
function strainWord(s){
    if (s >= 90) return 'No — about to leave';
    if (s >= 70) return 'Barely, and not for long';
    if (s >= 45) return 'Only just';
    if (s >= 22) return 'For now';
    return 'Comfortably';
}

/* =============================================================== ACTIONS */
function buyProperty(id, e){
    const p = PROPERTIES.find(x=>x.id===id);
    const st = state.properties[id];
    if (propertyCount() < p.unlock) return;
    const plan = plannedBuy(p);
    const need = state.buyQty === 'max' ? 1 : state.buyQty;
    if (plan.n < need) return;

    state.money -= plan.deposit;
    state.debt += plan.loan;
    if (!p.newBuild) state.dtiDebt += plan.loan;
    st.count += plan.n;
    st.deBasis += plan.n * p.price / state.marketIndex;   // banked at today's index → no instant gain

    fx('−'+money(plan.deposit)+' down', 'neg', e);
    flashCash(true);
    blip(180);
    const label = plan.n > 1 ? `${plan.n} more ${p.name.toLowerCase()}s` : `a ${p.name.toLowerCase()}`;
    addNews(`You mortgaged into ${label}. ${money(plan.loan)} of debt, someone else\'s roof, and a first-home buyer who just watched it sell.`, 'bad');
    if (syncTenants()) renderTenants();
    refresh();
}

function releaseEquity(e){
    const room = borrowable();
    if (room < 1000) return;
    state.money += room;
    state.debt += room;
    state.dtiDebt += room;   // owner drawdown counts against DTI
    fx('+'+money(room), 'pos', e);
    flashCash(false);
    blip(240);
    addNews(`Refinanced. Your houses earned more than you did, so you remortgaged them and pocketed ${money(room)} to buy another. This is called "wealth creation."`, 'event');
    refresh();
}

function doOperation(op, e){
    if (!opAvailable(op)) return;
    const m = multipliers();
    if (op.cost) state.money -= op.cost;

    if (op.money){
        const v = op.money(state, m);
        state.money += v;
        fx((v<0?'−':'+')+money(Math.abs(v)), v<0?'neg':'pos', e);
        flashCash(v < 0);
    } else if (op.cost){
        fx('−'+money(op.cost), 'neg', e);
        flashCash(true);
    }

    if (op.rentBoost){ state.rentMultBonus += op.rentBoost; state.rentRaises++; }
    if (op.addsUnits){ state.extraUnits += op.addsUnits; }

    let heat = op.heat || 0;
    if (heat > 0){
        if (op.heatKey === 'compliance' && state.upgrades.compliance) heat *= 0.5;
        if (op.heatKey === 'tribunal' && state.upgrades.tribunal) heat *= 0.5;
        heat *= m.heatGen;
    }
    addHeat(heat, e);

    const infl = (op.infl || 0) + (op.heat >= 0 ? m.inflPerOp : 0);
    if (infl) addInfluence(infl, e);

    if (op.id === 'ignoreHealthy') state.violations++;
    if (op.id === 'inventFee') state.feesInvented++;
    if (op.evicts){ state.evictions++; evictSomeone(); }
    if (op.removesHousehold){ state.extraUnits = Math.max(state.extraUnits-1, -baseTenantsFromProps()+1); }
    if (op.sell){ const sc = sellTopProperty(op.sell === 'cost'); if (sc){ fx('+'+money(sc), 'pos', e); flashCash(false); } }
    if (op.fhb){ state.fhbSales++; checkRedemption(); }

    if (op.strain) state.featured.forEach(t=> t.strain = clamp(t.strain + op.strain, 0, 100));

    if (op.news) addNews(op.news(state), op.heat < 0 ? 'good' : 'bad');
    blip(op.heat < 0 ? 320 : 200);
    if (syncTenants()) renderTenants();
    refresh();
}

/* sell one unit of the priciest owned type; clears its share of the mortgage.
   'market' realises the average held unit's CURRENT value (deBasis × index — real
   appreciation, only what actually accrued while you held it); 'cost' sells at the
   price you paid (you forgo the gain). Because a fresh purchase banks its basis at
   today's index, an immediate re-sale nets ≈0 — no buy-then-flip arbitrage. */
function sellTopProperty(atCost){
    let best = 0, id = null;
    PROPERTIES.forEach(p=>{ if (state.properties[p.id].count>0 && p.price>best){ best=p.price; id=p.id; } });
    if (!id) return 0;
    const p = PROPERTIES.find(x=>x.id===id);
    const st = state.properties[id];
    const avgDe = st.count > 0 ? st.deBasis / st.count : 0;   // de-indexed basis of the average unit
    const sale = atCost ? p.price : avgDe * state.marketIndex;
    const loanShare = Math.min(state.debt, p.price * (1 - p.deposit));
    const cashOut = Math.max(0, sale - loanShare);
    st.count--;
    st.deBasis = Math.max(0, st.deBasis - avgDe);
    state.debt = Math.max(0, state.debt - loanShare);
    if (!p.newBuild) state.dtiDebt = Math.max(0, state.dtiDebt - loanShare);
    state.money += cashOut;
    return cashOut;
}

/* a tenant leaves: show a clear on-card "moved out" moment, apply any cost/heat,
   then a new household moves in. This is the ONLY way featured tenants disappear,
   so it's always obvious why. */
function tenantExits(idx, title, newsText, opts){
    opts = opts || {};
    const t = state.featured[idx]; if (!t) return;
    if (_leaving[idx]) return;                 // already departing — ignore a double-trigger
    _leaving[idx] = { title, name:t.name, job:t.job };
    if (opts.cost){ state.money -= opts.cost; flashCash(true); }
    if (opts.heat) addHeat(opts.heat * multipliers().heatGen);
    if (opts.toast) toast(opts.toast, 'bad');
    if (newsText) addNews(newsText, 'bad');
    blip(150);
    renderTenants();                           // paints the "moved out" overlay via the shared path
    setTimeout(()=>{
        delete _leaving[idx];
        // replace by identity: only if this exact tenant is still in that slot (syncTenants
        // may have popped it already), so a resized array never gets a sparse hole
        if (state.featured[idx] === t) state.featured[idx] = makeTenant();
        renderTenants(); refresh();
    }, 1600);
    refresh();
}

function evictSomeone(){
    dossierNudge(5);                          // evictions are exactly the story she's writing
    if (state.featured.length === 0) return;
    const idx = Math.floor(Math.random()*state.featured.length);
    const t = state.featured[idx];
    tenantExits(idx, 'Evicted · 90-day notice',
        `${t.name} (${t.job}) served a 90-day no-cause notice — no reason required. Re-let at market by Friday.`,
        { toast: `${t.name} evicted — no reason required. That's the product.` });
}

function squeezeTenant(idx, e){
    const t = state.featured[idx]; if (!t) return;
    if (_leaving[idx]) return;              // already leaving — no double-squeeze

    const card = $('tenant-cards').children[idx];
    const bump = 20 + Math.floor(Math.random()*25);
    t.rent += bump;
    t.strain = clamp(t.strain + 15 + Math.floor(Math.random()*6), 0, 100);  // ~4–5 squeezes of runway
    state.money += bump * 10;              // the back-rent you just extracted — satisfying, discrete
    state.rentMultBonus += 0.003;          // squeezing individuals nudges your whole rent roll up
    state.rentRaises++;
    fx('+'+money(bump*10), 'pos', e);
    flashCash(false);
    addHeat(4 * multipliers().heatGen, e);
    blip(220);
    if (card){ const rn = card.querySelector('.rent-num'); if (rn) rn.textContent = money(t.rent) + '/wk'; }

    if (t.strain >= 100){
        tenantExits(idx, 'Priced out',
            `${t.name} (${t.job}) couldn't make the new rent and moved on. A void, a re-let, a fresh listing at +12%.`,
            { cost: 2500 + state.tenants*90, heat: 8, toast: `${t.name} was priced out — moved on. Voids and re-lets aren't free.` });
        return;
    }
    if (card){ card.classList.remove('breaking'); void card.offsetWidth; card.classList.add('breaking'); setTimeout(()=>{ if (card) card.classList.remove('breaking'); }, 360); }
    addNews(`Rent raised on ${t.name.split(' ')[0]} by ${money(bump)}/wk. "A modest market adjustment," you tell no one who asked.`, 'bad');
    refresh();
}

function buyService(sv, e){
    const owned = !!state.upgrades[sv.id];

    // capital: one-off permanent purchase
    if (sv.kind === 'capital'){
        if (owned || !meetsNeed(sv.need).ok || state.money < sv.cost) return;
        state.money -= sv.cost;
        state.upgrades[sv.id] = true;
        fx('−'+money(sv.cost), 'neg', e);
        flashCash(true);
        blip(300);
        toast(`Bought: ${sv.name}. Yours, permanently.`, 'good');
        addNews(`Bought "${sv.name}." An offshore accountant somewhere feels a warm glow.`, 'event');
        if (sv.id === 'trust') updatePrestigeButton();
        refresh();
        return;
    }

    // hire: cancel if engaged
    if (owned){
        state.upgrades[sv.id] = false;
        blip(180);
        toast(`Let go: ${sv.name}. The ${money(serviceFee(sv))}/wk stops — and so does the favour.`, 'event');
        refresh();
        return;
    }

    // hire: engage (pay one-off setup, then the weekly fee begins)
    if (!meetsNeed(sv.need).ok) return;
    const signup = sv.signup || 0;
    if (state.money < signup) return;
    if (signup){ state.money -= signup; fx('−'+money(signup), 'neg', e); flashCash(true); }
    state.upgrades[sv.id] = true;
    blip(300);
    toast(`Engaged: ${sv.name}. ${money(serviceFee(sv))}/wk from here on — cancel any time.`, 'good');
    addNews(`Engaged "${sv.name}." An offshore accountant somewhere feels a warm glow.`, 'event');
    refresh();
}

function doPolitics(pa, e){
    const cost = pa.cost(state);
    if (state.money < cost) return;
    if (!meetsNeed(pa.need).ok) return;
    if (pa.spendInfl && state.influence < pa.spendInfl) return;
    state.money -= cost;
    fx('−'+money(cost), 'neg', e);
    flashCash(true);
    if (pa.spendInfl){ state.influence -= pa.spendInfl; fx('−'+pa.spendInfl+' infl', 'neg', e); }
    if (pa.infl){ addInfluence(pa.infl, e); }
    if (pa.heat){ addHeat(pa.heat, e); }
    if (pa.heat && pa.heat < 0) dossierNudge(pa.heat * 1.6);   // laundering/spiking sets Vane back
    if (pa.permHeatDown){ state.permHeatMult *= pa.permHeatDown; }
    if (pa.once){ state.onceUsed[pa.id] = true; }
    if (pa.id === 'bribe' || pa.id === 'donate' || pa.id === 'textMinister') state.bribes++;
    if (pa.id === 'textMinister') unlockAch('textmin');
    blip(260);
    if (pa.ending){ addNews(pa.news(state), 'event'); refresh(); setTimeout(()=> triggerEnding(pa.ending), 500); return; }
    addNews(pa.news(state), pa.heat < 0 ? 'good' : 'event');
    refresh();
}

function addHeat(delta, e){
    if (!delta) return;
    state.heat = clamp(state.heat + delta, 0, CFG.HEAT_MAX);
    if (state.heat >= 25) state._everHot = true;         // unlocks Politics for good
    if (delta > 0) dossierNudge(delta * 0.22);          // every bit of scrutiny feeds her file
    if (e && delta > 0) fx('+'+Math.round(delta)+' heat', 'heat', e, 34);
    if (e && delta < 0) fx(Math.round(delta)+' heat', 'infl', e, 34);
}
function addInfluence(delta, e){
    state.influence += delta;
    state.lifetimeInfluence += Math.max(0, delta);
    if (e && delta) fx('+'+Math.round(delta)+' infl', 'infl', e, 20);
}

/* =============================================================== EVENTS */
function onWeek(){
    const m = multipliers();
    state.heat = clamp(state.heat - m.heatDecay, 0, CFG.HEAT_MAX);
    state.marketIndex *= (1 + CFG.APPRECIATION/52);   // steady appreciation
    dossierTick();

    const nowS = now()/1000;
    if (nowS - (state._lastNews||0) > CFG.NEWS_COOLDOWN && Math.random() < 0.3){
        addNews(pickHeadline()); state._lastNews = nowS;
    }
    // occasional "sponsored" drop between the headlines (radio-ad energy)
    if (nowS - (state._lastAd||0) > 55 && Math.random() < 0.08){
        const ad = pick(ADS);
        addNews(`<span class="spon-tag">SPONSORED</span> <b>${ad.brand}</b> — ${ad.tagline} <span class="spon-fine">${ad.fine}</span>`, 'sponsored');
        state._lastAd = nowS;
    }
    const eventProb = 0.03 + (state.heat/100) * 0.4;
    let firedEvent = false;
    if (nowS - (state._lastEvent||0) > CFG.EVENT_COOLDOWN && Math.random() < eventProb){
        rollEvent(); state._lastEvent = nowS; firedEvent = true;
    }
    if (state.heat >= CFG.HEAT_MAX - 1 && state.influence < 200){
        state.heatMaxStreak++;
        if (state.heatMaxStreak >= 3){ triggerEnding('expose'); return; }
    } else state.heatMaxStreak = 0;
    // an interactive "advisory" dilemma — the game pauses and asks you to choose.
    // (skipped on a week that already fired a scripted event, so they don't stack)
    if (!firedEvent) maybeDilemma(nowS);
}

function setRate(delta){
    state.rate = clamp(state.rate + delta, CFG.RATE_MIN, CFG.RATE_MAX);
}

function rollEvent(){
    const tier = heatTier().i;
    const pool = EVENTS.filter(ev => ev.tier <= tier && (!ev.cond || ev.cond()));
    if (pool.length === 0) return;
    pick(pool).run();
    refresh();
}

/* ---- Interactive dilemmas: the game pauses and hands you a satirical choice ---- */
let _dilemmaOpen = false;
function maybeDilemma(nowS){
    if (_dilemmaOpen || state.ended) return false;
    if (!$('modal-overlay').hidden) return false;      // never replace an open modal (intro/help/offline)
    if (nowS - (state._lastDilemma||0) < CFG.DILEMMA_COOLDOWN) return false;
    if (Math.random() > CFG.DILEMMA_PROB) return false;
    const pool = DILEMMAS.filter(d =>
        (!d.minPhase || phaseInfo().i >= d.minPhase) &&
        (!d.cond || d.cond()) &&
        !(d.once && state.onceUsed['dil_'+d.id]));
    if (!pool.length) return false;
    state._lastDilemma = nowS;
    openDilemma(pick(pool));
    return true;
}
function openDilemma(d){
    _dilemmaOpen = true;
    const prevSpeed = state.speed;
    state.speed = 0; setSpeedButtons();          // pause so the decision gets read
    const actions = d.choices.map(c => ({
        label: c.label, cls: c.cls || 'primary',
        fn: ()=>{
            _dilemmaOpen = false;
            state.speed = prevSpeed; setSpeedButtons();
            closeModal();
            try { if (c.apply) c.apply(state); } catch(e){}
            if (c.ach) unlockAch(c.ach);
            if (d.once) state.onceUsed['dil_'+d.id] = true;
            if (c.result) addNews(c.result, c.news || 'event');
            if (c.toast) toast(c.toast, c.toastCls || 'gold');
            blip(c.blip || 300);
            refresh();
        }
    }));
    showModal(`<div class="modal-kicker">${d.kicker || 'PortfolioMax™ Advisory'}</div><h1>${d.title}</h1>${d.body}`, actions);
}

const EVENTS = [
    /* ---- calm / positive (tier 0) ---- */
    { tier:0, cond:()=> state.tenants>0, run(){
        const b = Math.floor(grossRentWeekly()*0.6);
        state.money += b;
        addNews(`✅ EVENT: Interest deductibility refund lands. The tax break you lobbied for now pays for the lobbying. +${money(b)}.`, 'good');
    }},
    { tier:0, cond:()=> state.debt>200000, run(){
        setRate(-0.004);
        addNews(`✅ EVENT: The RBNZ blinks and trims the OCR. Your mortgage rate eases to ${(state.rate*100).toFixed(2)}%. Every dollar of relief, you keep.`, 'good');
    }},
    { tier:0, run(){
        addNews(`A think-tank you quietly fund releases a report proving the housing crisis is caused by tenants wanting houses.`, 'event');
    }},

    /* ---- noticed (tier 1) ---- */
    { tier:1, run(){
        addHeat(3);
        addNews(`⚠️ EVENT: A Reddit thread about your "tenancy administration contribution" (a renamed, illegal letting fee) hits 5k upvotes. Your PR person suggests you "log off." You do not.`, 'event');
    }},
    { tier:1, cond:()=> state.violations>0, run(){
        if (state.upgrades.compliance || state.influence>=100){
            addNews(`⚠️ EVENT: Healthy Homes inspector arrives. Your "Compliance Consultant" hands them a folder. They leave, subtly worse people.`, 'event');
        } else {
            const fine = state.tenants*900 + 5000; state.money -= fine; addHeat(6);
            addNews(`⚠️ EVENT: Healthy Homes inspection FAILED (mandatory since July 2025). Fined ${money(fine)}. Should've bought the consultant, not the jet-ski.`, 'bad');
        }
    }},
    { tier:1, cond:()=> state.debt>150000, run(){
        setRate(0.005);
        addNews(`⚠️ EVENT: RBNZ hikes the OCR again on petrol-driven inflation. Your mortgage rate jumps to ${(state.rate*100).toFixed(2)}% — interest bill up to ${money(interestWeekly())}/wk. You forward the cost to tenants and the blame to Wellington.`, 'bad');
    }},

    /* ---- heat (tier 2) ---- */
    { tier:2, cond:()=> state.rentRaises>3, run(){
        addHeat(8);
        addNews(`🔥 EVENT: Your tenants find Renters United's free TenancyHelp tool. They're auto-drafting Tribunal letters. One letter is extremely good.`, 'bad');
    }},
    { tier:2, cond:()=> state.evictions>0, run(){
        if (state.upgrades.tribunal){
            addNews(`⚖️ EVENT: Tenancy Tribunal case. Your Season Pass kicks in — you win on a technicality involving a comma. Costs awarded to the crying party.`, 'event');
        } else {
            const pay = 4000 + state.tenants*200; state.money -= pay; addHeat(4);
            addNews(`⚖️ EVENT: Tribunal orders you to repay ${money(pay)} in unlawful fees. You appeal, on principle (of keeping the money).`, 'bad');
        }
    }},
    { tier:2, cond:()=> state.tenants>=4, run(){
        const loss = Math.floor(grossRentWeekly()*1.5); state.money -= loss;
        addNews(`✈️ EVENT: Two households emigrate to Brisbane mid-tenancy. Rents are falling and you "can't find good tenants" — a record 43% of landlords agree. −${money(loss)} in voids.`, 'bad');
    }},

    /* ---- crisis (tier 3) ---- */
    { tier:3, run(){
        if (state.influence >= 150){
            state.influence -= 60;
            addNews(`🛡️ EVENT: An exposé loads — then a minister calls you "a valued housing provider" on Morning Report and the story dies mid-sentence. −60 influence, well spent.`, 'event');
        } else {
            state.heat = clamp(state.heat+6,0,100); state.influence = Math.max(0, state.influence-40);
            addNews(`💥 EVENT: The Spinoff runs "Landlord Parliament" — the investors who bought 25 rentals after writing the rules — and you're in the sidebar. The public is, briefly, furious.`, 'bad');
        }
    }},
    { tier:3, cond:()=> propertyCount()>=6, run(){
        state.marketIndex *= 0.92; shake();
        addNews(`📉 EVENT: Market correction — values slide 8% as the "recovery" stalls. Your equity thins and the over-leveraged wobble. Debt, however, does not shrink.`, 'bad');
    }},
    { tier:3, cond:()=> state.tenants>=6, run(){
        const loss = Math.floor(grossRentWeekly()*3); state.money -= loss; addHeat(5); shake();
        addNews(`✊ EVENT: RENT STRIKE. Your tenants collectively withhold. −${money(loss)} while they hold the line and you hold your breath.`, 'bad');
    }},
    { tier:3, run(){
        addHeat(4);
        addNews(`📣 EVENT: Protesters outside your Remuera villa with a banner: "HOUSES ARE FOR LIVING IN." You draw the curtains (imported, blockout).`, 'bad');
    }},
];

/* ------------------------------------------------------------------ DILEMMAS
   Interactive choices that pause the game. Each is a small satirical set-piece
   with real trade-offs (cash / scrutiny / influence). `apply(s)` mutates state;
   `result` drops a news line; `cls:'ghost'` marks the restrained/decent option. */
const DILEMMAS = [
    { id:'tiktok', title:'It\'s trending 📱',
      body:`<p>A tenant's phone-tour of the black mould in their kids' bedroom hits <b>400,000 views</b> overnight. The caption is just your name and a skull emoji.</p>`,
      choices:[
        { label:'"It\'s lifestyle condensation"', apply:s=> addHeat(9),
          result:`You blame "lifestyle moisture — too many showers, too much breathing." The internet blames you. The mould, neutral, keeps growing.`, news:'bad' },
        { label:'$50 Prezzy card + a 4-page NDA', apply:s=>{ s.money -= 3000; addHeat(-7); },
          result:`A supermarket voucher and a non-disclosure agreement later, the video vanishes. So does the tenant's last shred of faith in adults.`, news:'event' },
        { label:'Ride it out', cls:'ghost', apply:s=> addHeat(13),
          result:`You log off, confident it'll blow over. It does not blow over. It gets a follow-up. The follow-up has a lawyer in it.`, news:'bad' },
      ]},
    { id:'church', title:'A structure presents itself ⛪', minPhase:1,
      body:`<p>Your accountant, eyes shining, slides over a folder. "Register the entire portfolio," he whispers, "<b>as a religion.</b> Fully tax-exempt. Legally, a miracle."</p>`,
      choices:[
        { label:'Praise be — go tax-free', ach:'church', apply:s=>{ s.rentMultBonus += 0.025; addHeat(6); },
          result:`The Church of Perpetual Yield is now a registered charity. Sunday service is a rent review. The collection plate is a direct debit.`, news:'event', toast:'Blessed are the leveraged. +permanent yield.' },
        { label:'Even you have a limit', cls:'ghost',
          result:`You decline, on the grounds that it's "a bit much." A rare flicker of shame. It passes by morning, like all the others.`, news:'event' },
      ]},
    { id:'photoop', title:'A photo opportunity 📸',
      body:`<p>A backbench MP wants to be pictured at "one of your <i>affordable</i> rentals." Cameras at ten. None of your rentals are affordable, or photogenic.</p>`,
      choices:[
        { label:'Stage the good one; motel the tenant', apply:s=>{ s.money -= 2000; addInfluence(40); addHeat(5); },
          result:`You move the tenant to a motel for the day and fill the flat with a fruit bowl. The MP calls it "the mixed market working." Checkout was 10am.`, news:'event' },
        { label:'Decline', cls:'ghost',
          result:`You pass. The MP finds a more accommodating landlord within the hour. There is always a more accommodating landlord.`, news:'event' },
      ]},
    { id:'winston', title:'Winston is on the line 🐎', minPhase:2,
      body:`<p>A gravelled voice you half-recognise mentions "an opportunity — a racehorse, a syndicate, and a select-committee timetable that could go either way."</p>`,
      choices:[
        { label:'"I\'m listening"', ach:'winston', apply:s=>{ s.money -= 25000; addInfluence(60); },
          result:`You now own 4% of a horse named Deductible and 100% of a minister's undivided, deniable attention. The horse has better form.`, news:'event' },
        { label:'Hang up', cls:'ghost',
          result:`You hang up. Somewhere, a phone is already dialling the next number on a very short, very expensive list.`, news:'event' },
      ]},
    { id:'kid', title:'A question at dinner 🍽',
      body:`<p>Your kid looks up from their plate. "Dad — why did the family in the newspaper have to leave their house? They didn't do anything."</p>`,
      choices:[
        { label:'Explain supply and demand', apply:s=> addHeat(2),
          result:`You explain the market with the salt and pepper shakers. They nod slowly — the way children nod when they've caught an adult lying and decided to let it go.`, news:'event' },
        { label:'Change the subject', cls:'ghost',
          result:`You ask about their day instead. They let you. Kids are kinder to us than we deserve, which is its own kind of rent.`, news:'event' },
        { label:'…sell that family the house at cost', cls:'ghost',
          apply:s=>{ s.fhbSales++; toast('You did a decent thing. Nobody will believe it.', 'good'); setTimeout(checkRedemption, 50); },
          result:`You call the agent that night and sell to the family in the photo, at what you paid. For one evening, you're the landlord your kid already thinks you are.`, news:'good' },
      ]},
    { id:'rnz', title:'A reporter wants comment 🎙', minPhase:1,
      body:`<p>An RNZ journalist emails: comment on "your portfolio and its practices" by <b>5pm</b>. Attached: the mould photos, the fee schedule, and a spreadsheet with your name bolded.</p>`,
      choices:[
        { label:'"No comment" + a lawyer\'s letter', ach:'nocomment', apply:s=> addHeat(7),
          result:`Your lawyer's threatening letter becomes the story. It is, everyone agrees, a very good story. Streisand would understand.`, news:'bad' },
        { label:'Charm-offensive lunch ($4k)', apply:s=>{ s.money -= 4000; addHeat(-10); },
          result:`Two hours and a degustation later she "can't stand the story up — yet." You pick up the bill and the tab on her goodwill.`, news:'event' },
      ]},
    { id:'bank', title:'"You\'re under-leveraged" 🏦',
      body:`<p>Your relationship manager frowns at your file like it's personally disappointed her. "Someone of your standing," she says, "should be carrying <i>far</i> more debt."</p>`,
      choices:[
        { label:'Gear up — draw it all down', apply:s=>{ const room = borrowable(); s.money += room; s.debt += room; s.dtiDebt += room; },
          result:`You borrow against the borrowing against the borrowing. The manager beams. Somewhere in a basement, a stress-test model quietly files for stress leave.`, news:'event', toast:'Maximum leverage engaged. What could go wrong.' },
        { label:'Keep some powder dry', cls:'ghost',
          result:`You decline to gear up further. The manager notes, coolly, that you're "not really a growth mindset." You'll never eat lunch in that branch again.`, news:'event' },
      ]},
    { id:'panama', title:'Your name is in the leak 🗂', minPhase:2,
      body:`<p>An offshore-trust database has been leaked to a consortium of journalists. Your name is in it, next to a shell company named — regrettably — "Squeeze Holdings II."</p>`,
      choices:[
        { label:'Deny — "different J. Smith"', apply:s=> addHeat(8),
          result:`You insist it's a <i>different</i> you. There are, you point out, many of you. This is, unfortunately, the emerging theme of the coverage.`, news:'bad' },
        { label:'Blame the accountant', cls:'ghost', apply:s=>{ s.money -= 10000; addHeat(-4); },
          result:`The accountant takes the fall and a generous "consultancy exit." Loyalty has a price and, conveniently, it's fully deductible.`, news:'event' },
      ]},
    { id:'heatpump', title:'The heat pump, again ❄️',
      body:`<p>A tenant with a three-week-old baby emails for the fifth time about the dead heat pump. It is June. The forecast is "brisk." The email is very polite, which is somehow worse.</p>`,
      choices:[
        { label:'Actually fix it ($3.5k)', cls:'ghost', ach:'decent', apply:s=>{ s.money -= 3500; addHeat(-5); },
          result:`You send someone. The heat pump wheezes back to life; the baby is warm. You feel a strange, unfamiliar warmth of your own. Deeply suspicious, you have it checked. It's a conscience. It clears up.`, news:'good' },
        { label:'Invoice a "servicing surcharge"', apply:s=>{ s.money += 500; addHeat(6); s.feesInvented++; },
          result:`You bill them $500 for the reminder emails and reclassify the heat pump as "a modernist sculpture — non-operational by design."`, news:'bad' },
      ]},
    { id:'award', title:'Landlord of the Year 🏆', minPhase:1,
      body:`<p>The Property Investors' Federation would like to present you with <b>Landlord of the Year</b>. There will be a gala, a trophy, and — unavoidably — press.</p>`,
      choices:[
        { label:'Accept the trophy', ach:'award', apply:s=>{ addInfluence(50); addHeat(8); },
          result:`Your acceptance speech thanks "the tenants, without whom none of this rent would be possible." The room laughs. One waiter does not.`, news:'event' },
        { label:'Decline — too hot right now', cls:'ghost', apply:s=> addHeat(-4),
          result:`You decline quietly. Humility is the ultimate flex, and — your PR firm notes approvingly — completely free.`, news:'event' },
      ]},
    { id:'ghostflat', title:'Thirty dark windows 🌃', minPhase:2,
      body:`<p>An offshore owner offers you a management contract for <b>30 apartments they never intend to rent</b> — held empty, purely to appreciate. Easy fee. No tenants, no complaints, no people.</p>`,
      choices:[
        { label:'Manage the empties', ach:'ghost', apply:s=>{ s.money += 15000; addHeat(4); },
          result:`Thirty apartments, professionally kept empty, lights on timers so they "look lived in." The housing shortage, professionally maintained.`, news:'event' },
        { label:'Pass — even for you', cls:'ghost',
          result:`You pass. Empty homes in a housing crisis is, you decide, a bad look. The fee finds someone with a better look, or none at all.`, news:'event' },
      ]},
    { id:'ministerText', title:'A minister texts you 📲', minPhase:3,
      body:`<p>A Cabinet minister forwards you a <b>draft Bill "for your thoughts"</b> — before it's public, before the tenants it governs have heard a word of it.</p>`,
      choices:[
        { label:'Suggest "improvements"', apply:s=>{ s.permHeatMult *= 0.9; addInfluence(40); },
          result:`Your redlines make it into the Bill verbatim. The public consultation runs later — a formality you've already, privately, completed.`, news:'event', toast:'You are now, functionally, the policy.' },
        { label:'Screenshot it for later', cls:'ghost', apply:s=>{ addInfluence(80); addHeat(6); },
          result:`You keep the receipt. Everyone in this game keeps receipts — it's the only thing anyone's actually building.`, news:'event' },
      ]},
    { id:'rival', title:'A rival makes an offer 🛥', minPhase:1,
      body:`<p>A bigger landlord — nicer boat, worse Google reviews — offers <b>cash today</b> for your leakiest, most troublesome block. He seems oddly, specifically keen.</p>`,
      choices:[
        { label:'Sell it — his problem now', apply:s=>{ const c = sellTopProperty(false); if (c) fx('+'+money(c),'pos',{clientX:innerWidth/2,clientY:200}); },
          result:`He overpays without blinking. Either he knows something you don't, or he's a fool. In this market those pay identically.`, news:'event' },
        { label:'Hold — what does he know?', cls:'ghost',
          result:`You hold. If he wants it this badly, you reason, it must be worth keeping. This is exactly how he wanted you to reason.`, news:'event' },
      ]},
    { id:'protest', title:'A crowd outside 📣', cond:()=> state.heat > 35,
      body:`<p>Renters are protesting outside your office. Someone has made a genuinely excellent sign. A camera crew has arrived to film the genuinely excellent sign.</p>`,
      choices:[
        { label:'Send out coffee + a warm statement', apply:s=>{ s.money -= 500; addHeat(-6); },
          result:`You send down flat whites and a statement about "shared challenges." The sign stays up, but the six-o'clock photo softens to lukewarm.`, news:'event' },
        { label:'Call it "economic illiteracy" on talkback', apply:s=>{ addHeat(10); addInfluence(20); },
          result:`You go on the radio and call them economically illiterate. The base adores it. The nurses do not — but the nurses, you note, were never the base.`, news:'bad' },
      ]},
];

/* ---------------------------------------------------------- RAP SHEET (achievements)
   Threshold ones carry a `cond(state)` checked every refresh; choice/ending ones are
   unlocked directly by `unlockAch(id)`. */
const ACHIEVEMENTS = [
    { id:'firstProp',   emoji:'🏚️', name:'On the Ladder',                 desc:'Buy your first property.',                         cond:()=> propertyCount()>=1 },
    { id:'tenProps',    emoji:'🏘️', name:'Portfolio, Assembled',          desc:'Own ten properties at once.',                      cond:()=> propertyCount()>=10 },
    { id:'block',       emoji:'🏢', name:'The Whole Building',             desc:'Own an entire apartment block.',                   cond:()=> state.properties.block.count>=1 },
    { id:'tenbag',      emoji:'📈', name:'Ten-Bagger',                     desc:'Push net worth past $10m.',                        cond:()=> netWorth()>=1e7 },
    { id:'leverage',    emoji:'🏦', name:'Maximum Leverage',               desc:'Carry over $5m of mortgage debt at once.',         cond:()=> state.debt>=5e6 },
    { id:'kingmaker',   emoji:'👑', name:'Kingmaker',                      desc:'Reach the top of the influence ladder.',           cond:()=> state.lifetimeInfluence>=3000 },
    { id:'firstEvict',  emoji:'🔑', name:'First Blood',                    desc:'Order your first eviction.',                       cond:()=> state.evictions>=1 },
    { id:'serialEvict', emoji:'🚪', name:'Serial Evictor',                 desc:'Order ten evictions.',                             cond:()=> state.evictions>=10 },
    { id:'fees',        emoji:'🧾', name:'Creative Accounting',            desc:'Invent ten "fees".',                               cond:()=> state.feesInvented>=10 },
    { id:'damp',        emoji:'💧', name:"It's Not Damp, It's Character",  desc:'Ignore Healthy Homes five times.',                 cond:()=> state.violations>=5 },
    { id:'trust',       emoji:'🏝️', name:'Offshore & Untouchable',        desc:'Move everything into the family trust.',           cond:()=> !!state.upgrades.trust },
    { id:'survivor',    emoji:'🧯', name:'Outran the Exposé',             desc:'Take scrutiny past 95 and bring it back down.' },
    { id:'church',      emoji:'⛪', name:'Praise Be',                      desc:'Register the portfolio as a religion.' },
    { id:'winston',     emoji:'🐎', name:'Backed a Winner',               desc:"Accept Winston's racehorse opportunity." },
    { id:'award',       emoji:'🏆', name:'Landlord of the Year',          desc:"Accept the Investors' Federation award." },
    { id:'nocomment',   emoji:'📵', name:'No Comment',                     desc:"Answer a reporter with a lawyer's letter." },
    { id:'decent',      emoji:'🫶', name:'A Rare Decent Act',             desc:'Actually fix the heat pump for the family.' },
    { id:'ghost',       emoji:'🌃', name:'Lights On, Nobody Home',        desc:'Take on thirty deliberately-empty apartments.' },
    { id:'textmin',     emoji:'📲', name:'Straight to the Top',           desc:'Text a minister directly.' },
    { id:'vane',        emoji:'📰', name:'Front-Page Material',           desc:'Get published by Fiona Vane.' },
    { id:'winMinister', emoji:'🏛️', name:'The Coronation',                desc:'Be appointed Minister of Housing.' },
    { id:'winEmpire',   emoji:'🥂', name:'Weather System With a Mortgage', desc:'Reach a $400m empire.' },
    { id:'winReform',   emoji:'🕊️', name:'The Reformed Landlord',        desc:'Reach the secret redemption ending.' },
    { id:'lostExpose',  emoji:'💥', name:'Front-Page Villain',            desc:'Get taken down by the exposé.' },
    { id:'lostCollapse',emoji:'📉', name:'Margin Called',                 desc:'Leverage yourself into oblivion.' },
];
function achCount(){ let n=0; ACHIEVEMENTS.forEach(a=>{ if (state.achievements[a.id]) n++; }); return n; }
function unlockAch(id){
    if (!id || state.achievements[id]) return;
    const a = ACHIEVEMENTS.find(x=>x.id===id); if (!a) return;
    state.achievements[id] = true;
    toast(`🏅 Rap Sheet: ${a.name}`, 'gold');
    addNews(`🏅 <b>Rap sheet updated —</b> "${a.name}": ${a.desc}`, 'event');
    confetti(24); blip(520);
}
function checkAchievements(){
    for (let i=0;i<ACHIEVEMENTS.length;i++){
        const a = ACHIEVEMENTS[i];
        if (a.cond && !state.achievements[a.id] && a.cond(state)) unlockAch(a.id);
    }
    if (state.heat >= 95) state._wasRedlined = true;
    if (state._wasRedlined && state.heat < 55){ state._wasRedlined = false; unlockAch('survivor'); }
}
function modalRapSheet(){
    const cells = ACHIEVEMENTS.map(a=>{
        const got = !!state.achievements[a.id];
        return `<div class="ach ${got?'got':'locked'}">
            <div class="ach-emoji">${got?a.emoji:'🔒'}</div>
            <div class="ach-info"><div class="ach-name">${got?a.name:'Locked'}</div><div class="ach-desc">${a.desc}</div></div>
        </div>`;
    }).join('');
    showModal(`<div class="modal-kicker">Your permanent record</div><h1>The Rap Sheet 🏅</h1>
        <p class="rap-count">${achCount()} of ${ACHIEVEMENTS.length} on file — none of it, legally, admissible; all of it, morally, damning.</p>
        <div class="ach-grid">${cells}</div>`,
        [{ label:'Close', cls:'primary', fn:()=> closeModal() }]);
}

/* ------------------------------------------------------- NEMESIS: the reporter's dossier
   Fiona Vane (fictional) builds a case as you generate heat. Ignore her and she publishes —
   a huge scrutiny hit that can trigger the exposé. Spike her story (Politics) to set her back. */
const DOSSIER_CHAPTERS = [
    { at:22, news:`📓 <b>Fiona Vane</b> has started calling your former tenants for a story. Several were delighted to help.`,
      line:'She\'s working your former tenants.' },
    { at:48, news:`📓 <b>Vane</b> now has the "administration contribution" schedule and a folder of Tribunal rulings. She\'s building something.`,
      line:'She has the fees and the Tribunal files.' },
    { at:72, news:`📓 <b>Vane\'s</b> editor has cleared the front page. Legal is "comfortable." You have days, not weeks.`,
      line:'Front page cleared. Legal is comfortable.' },
    { at:90, news:`📓 <b>Vane</b> has emailed you for comment by 5pm. There is no version of this you enjoy.`,
      line:'She wants comment by 5pm.' },
];
function dossierTick(){
    if (state.dossier >= 100){ dossierPublish(); return; }
    // she cools off slowly once you stop feeding her (faster with a PR firm on retainer).
    // NB: decay lives here, AFTER the publish check, so a file that hits 100 actually drops.
    state.dossier = clamp(state.dossier - (0.4 + (state.upgrades.prFirm ? 1.2 : 0)), 0, 100);
    let ch = 0;
    DOSSIER_CHAPTERS.forEach((c,i)=>{ if (state.dossier >= c.at) ch = i+1; });
    if (ch > state._dossierChapter){
        state._dossierChapter = ch;
        addNews(DOSSIER_CHAPTERS[ch-1].news, 'bad');
        if (ch >= 3) shake();
    } else if (ch < state._dossierChapter){
        state._dossierChapter = ch;               // you cooled her off
    }
}
function dossierPublish(){
    state.dossier = 0; state._dossierChapter = 0; state._vanePublished = true;
    addNews(`💥 <b>THE FRONT PAGE:</b> Fiona Vane's investigation drops across every outlet at once — "The Landlord Who Wrote The Rules." The mould, the fees, the evictions, your name in 48-point type. Scrutiny detonates.`, 'bad');
    toast('💥 Vane published. This is what she was building.', 'bad');
    unlockAch('vane');
    shake();
    addHeat(34);
}
function dossierNudge(delta){ state.dossier = clamp(state.dossier + delta, 0, 100); }

/* ------------------------------------------------------------------ LIVE TICKER */
let _tickerItems = [], _lastTickerRender = 0;
function _stripHtml(s){ const d = document.createElement('div'); d.innerHTML = s; return (d.textContent || '').replace(/\s+/g,' ').trim(); }
function pushTicker(text){
    const t = _stripHtml(text); if (!t) return;
    _tickerItems.unshift(t);
    if (_tickerItems.length > 12) _tickerItems.pop();
    if (now() - _lastTickerRender > 2500){ _lastTickerRender = now(); renderTicker(); }
}
function renderTicker(){
    const wrap = $('ticker'), track = $('ticker-track'); if (!wrap || !track) return;
    if (!_tickerItems.length){ wrap.hidden = true; return; }
    wrap.hidden = false;
    const seq = _tickerItems.map(t=>`<span class="ticker-item">${t}</span>`).join('<span class="ticker-sep">◆</span>');
    track.innerHTML = seq + '<span class="ticker-sep">◆</span>' + seq + '<span class="ticker-sep">◆</span>';
    track.style.animationDuration = Math.max(34, _tickerItems.length * 7) + 's';
}

/* =============================================================== ENDINGS */
function checkPassiveEndings(){
    if (state.ended) return;
    if (netWorth() >= 400000000){ triggerEnding('empire'); return; }
    // insolvency: you owe more than everything you own is worth (scales at every level,
    // so a transient cash dip from one event can't falsely end an asset-rich player)
    if (netWorth() < -50000){ triggerEnding('collapse'); return; }
}
function checkRedemption(){
    if (state.fhbSales >= 3 && state.evictions === 0){ triggerEnding('reform'); }
}

function triggerEnding(kind){
    if (state.ended) return;
    state.ended = true; state.endingKind = kind; state.speed = 0; setSpeedButtons();
    _dilemmaOpen = false;
    unlockAch({ minister:'winMinister', empire:'winEmpire', reform:'winReform', expose:'lostExpose', collapse:'lostCollapse' }[kind]);
    if (kind === 'expose' || kind === 'collapse') shake();
    showEndingModal(kind);
    if (kind === 'empire' || kind === 'minister' || kind === 'reform'){
        confetti(160); setTimeout(()=> confetti(120), 500);
    }
}
/* builds & shows the end-screen — separated so init() can re-show it after a reload
   (the ended flag is persisted, so without this the board would come back frozen). */
function showEndingModal(kind){
    const stats = `
        <div class="stat-grid">
            <div>Properties<b>${propertyCount()}</b></div>
            <div>Households<b>${fmt(state.tenants)}</b></div>
            <div>Net worth<b>${money(netWorth())}</b></div>
            <div>Mortgage debt<b>${money(state.debt)}</b></div>
            <div>Evictions ordered<b>${state.evictions}</b></div>
            <div>Healthy Homes ignored<b>${state.violations}</b></div>
            <div>Fees invented<b>${state.feesInvented}</b></div>
            <div>🏅 Rap Sheet<b>${achCount()}/${ACHIEVEMENTS.length}</b></div>
        </div>`;

    const E = {
        minister: { kicker:'Ending — The Coronation', title:'Minister of Housing 🏛️',
            body:`<p>You've been appointed to govern the housing system you spent the whole game strip-mining — the Kāinga Ora board, secured the modern way: a text to a mate, no Cabinet, no questions.</p>
                  <p>A landlord with <b>${state.evictions} evictions</b> and <b>${state.violations} ignored standards</b> now sets the rules, writes the RMA replacement, AND — as a bonus portfolio — is the country's chief lawyer. You go on the news to say the answer is "supply" and "getting government out of the way." Reporters nod. In a car parked outside, a nurse the bank declined reads it and turns the engine on for warmth.</p>
                  <p>The irony is so dense you could subdivide it. Consent-free, obviously.</p>` },
        empire: { kicker:'Ending — Total Victory', title:'The Empire 🏢',
            body:`<p>Net worth past four hundred million, most of it borrowed into being. You own so much of Aotearoa that "landlord" undersells it — you're a weather system with a mortgage.</p>
                  <p>The bank lent you 7× an income you barely earn, against rent you barely justify, to buy homes a first-home buyer will never be advanced 6× for. You won capitalism on margin. The prize is that everyone else lost, and pays you monthly — right up until they board the Brisbane flight.</p>` },
        expose: { kicker:'Ending — The Reckoning', title:'The Exposé 💥',
            body:`<p>You couldn't buy the silence fast enough. <b>Fiona Vane's</b> investigation dropped across RNZ, Stuff and The Spinoff the same morning — the mould, the fees, the pregnant tenant, the rat droppings, the boat named "Yield." She never did return your lawyer's calls.</p>
                  <p>With <b>${state.evictions} evictions</b> and <b>${state.violations} ignored standards</b> on the record and not enough influence to make it vanish, the Tribunal moved, the banks called the loans, and the leverage that built you took you apart. Turns out the immunity was rented too. You missed a payment.</p>` },
        collapse: { kicker:'Ending — Margin Call', title:'The Market Correction 📉',
            body:`<p>You leveraged into the sky and the sky sent a bill. The RBNZ, having cut rates six times, hiked them the moment petrol flinched; your interest-only bombs came due; the "recovery" everyone promised in 2026 turned out to be a landing with the wheels up.</p>
                  <p>Negative gearing stopped being a strategy and started being the truth. You went under owing <b>${money(state.debt)}</b> against homes worth less than the loans. The bank takes the lot and sells it to the next you. The tenants don't even get to change the locks.</p>` },
        reform: { kicker:'Ending — The Secret One', title:'The Reformed Landlord 🕊️',
            body:`<p>You sold the homes to the families living in them, at cost, and never evicted a soul. Property forums call you "compromised." NZPIF revokes your membership. The tenants call you the best landlord they ever had — a devastating indictment of all the others.</p>
                  <p>Here's the twist the game owes you: it barely moved the market. A few families housed; the crisis didn't notice. No election result fixes this by itself, and neither does one decent landlord. Individual virtue is lovely, and it is not policy.</p>
                  <p>You did a good thing anyway. That has to count for something — even if the spreadsheet, and the country, carry on as if it didn't.</p>` },
    };
    const e = E[kind] || E.empire;
    showModal(`<div class="modal-kicker">${e.kicker}</div><h1>${e.title}</h1>${e.body}${stats}`, [
        { label:'📸 Share result', cls:'gold', fn:()=>{ shareCard(); } },
        { label:'Play again', cls:'primary', fn:()=>{ hardReset(); } },
    ], true);
}

/* =============================================================== PRESTIGE */
function updatePrestigeButton(){
    const btn = $('prestige-btn');
    btn.hidden = !(state.upgrades.trust && netWorth() >= 8000000);
}
function doPrestige(){
    const gain = state.legacy + 1;
    showModal(`
        <div class="modal-kicker">Restructure</div>
        <h1>Move it all into the Trust 🏦</h1>
        <p>Liquidate the visible empire — properties, cash, and the debt that built it, all gone from your name, which is the point. You keep your <b>political influence</b> (halved) and your <b>Business Services</b>, and return as a clean-skinned "first-time investor" the banks adore.</p>
        <p>Permanent bonus rises to <b>+${Math.round(gain*CFG.LEGACY_BONUS*100)}% rent</b>, forever. You have faced no consequences. You have simply become harder to see.</p>
    `, [
        { label:'Not yet', cls:'ghost', fn:()=> closeModal() },
        { label:'Restructure', cls:'gold', fn:()=>{
            const keep = { upgrades: state.upgrades, legacy: state.legacy+1, influence: Math.floor(state.influence/2),
                           lifetime: state.lifetimeInfluence, muted: state.muted, buyQty: state.buyQty,
                           achievements: state.achievements };
            state = defaultState();
            state.upgrades = keep.upgrades; state.legacy = keep.legacy; state.influence = keep.influence;
            state.lifetimeInfluence = keep.lifetime; state.muted = keep.muted; state.buyQty = keep.buyQty;
            state.achievements = keep.achievements;
            state._phaseSeen = 0; state._unlockedSeen = unlockedTierCount();
            _leaving = {};
            syncTenants(); buildAll(); closeModal();
            toast(`Restructured. Legacy tier ${keep.legacy}. Nothing is your fault now.`, 'gold');
            refresh(); saveGame(true);
        }},
    ]);
}

/* =============================================================== NEWS */
function addNews(text, kind){
    const feed = $('news-feed');
    const item = document.createElement('div');
    item.className = 'news-item' + (kind ? ' '+kind : '');
    const stamp = new Date().toLocaleTimeString('en-NZ', { hour:'2-digit', minute:'2-digit' });
    item.innerHTML = `<span class="stamp">${stamp}</span>${text}`;
    feed.insertBefore(item, feed.firstChild);
    while (feed.children.length > 24) feed.removeChild(feed.lastChild);
    pushTicker(text);
    const newsTab = document.querySelector('.tab[data-tab="news"]');
    if (newsTab && !newsTab.classList.contains('active')){
        state._unread = (state._unread||0) + 1;
        let b = newsTab.querySelector('.badge');
        if (!b){ b = document.createElement('span'); b.className='badge'; newsTab.appendChild(b); }
        b.textContent = state._unread;
    }
}
function renderNews(first){
    if (first){ $('news-feed').innerHTML = ''; addNews('Welcome to PortfolioMax™. Election-year wealth-building starts now. The bank is ready to lend you a life other people can\'t rent.', 'event'); }
}

/* rotating "Sponsored" fake-ad banner */
let _adIdx = Math.floor(Math.random() * ADS.length);
function showAd(){
    const el = $('ad-banner'); if (!el) return;
    const ad = ADS[_adIdx % ADS.length]; _adIdx++;
    el.style.opacity = '0';
    setTimeout(()=>{
        el.className = 'ad-banner ad-hue-' + ad.hue;
        el.querySelector('[data-logo]').textContent = ad.logo;
        el.querySelector('[data-brand]').textContent = ad.brand;
        el.querySelector('[data-tagline]').textContent = ad.tagline;
        el.querySelector('[data-fine]').textContent = ad.fine;
        el.style.opacity = '1';
    }, 220);
}
function adClick(){
    toast('You clicked an ad. The most Kiwi thing you\'ll do all day.', 'gold');
    blip(300);
}

/* =============================================================== JUICE */
function fx(text, cls, e, offsetY){
    if (!e) return;
    if (!e.currentTarget && !e.target && e.clientX === undefined) return;
    const layer = $('fx-layer');
    const span = document.createElement('div');
    span.className = 'fx-num ' + cls; span.textContent = text;
    let x, y;
    const tgt = e.currentTarget || e.target;
    if (tgt && tgt.getBoundingClientRect){
        const r = tgt.getBoundingClientRect();
        x = r.left + r.width/2 + (Math.random()*40-20); y = r.top + (offsetY||10);
    } else { x = e.clientX; y = e.clientY; }
    span.style.left = x + 'px'; span.style.top = y + 'px';
    layer.appendChild(span);
    setTimeout(()=> span.remove(), 1150);
}
/* a short screen-shake for crisis beats (exposé, crash, rent strike) */
function shake(){
    const a = document.querySelector('.app'); if (!a) return;
    a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
    setTimeout(()=>{ if (a) a.classList.remove('shake'); }, 520);
}
/* celebratory confetti burst for phase-ups and winning endings */
function confetti(n){
    const layer = $('fx-layer'); if (!layer) return;
    const colors = ['#00858E','#E0A500','#2FA36B','#ef6a4d','#7b5ea7','#17A2A2'];
    n = n || 90;
    for (let i=0;i<n;i++){
        const d = document.createElement('div');
        d.className = 'confetti';
        d.style.left = (Math.random()*100).toFixed(1) + 'vw';
        d.style.background = colors[i % colors.length];
        d.style.animationDelay = (Math.random()*0.4).toFixed(2) + 's';
        d.style.setProperty('--dx', (Math.random()*260-130).toFixed(0)+'px');
        d.style.setProperty('--rot', (Math.random()*720-360).toFixed(0)+'deg');
        layer.appendChild(d);
        setTimeout(()=> d.remove(), 3000);
    }
}
/* flash the Portfolio Cash figure on a discrete money change (green up / red down).
   Only fired from explicit player actions & events — never from passive accrual. */
function flashCash(neg){
    const el = $('money'); if (!el) return;
    const cls = neg ? 'flash-red' : 'flash';
    el.classList.remove('flash', 'flash-red');
    void el.offsetWidth;                 // restart the CSS animation
    el.classList.add(cls);
    setTimeout(()=>{ if (el) el.classList.remove(cls); }, 520);
}
function toast(text, cls){
    const layer = $('toast-layer');
    const t = document.createElement('div');
    t.className = 'toast' + (cls?' '+cls:''); t.textContent = text;
    layer.appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(30px)'; t.style.transition='all .3s'; }, 3200);
    setTimeout(()=> t.remove(), 3600);
}
let audioCtx = null;
function blip(freq){
    if (state.muted) return;
    try {
        audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type='triangle'; o.frequency.value = freq||220; g.gain.value = 0.04;
        o.connect(g); g.connect(audioCtx.destination); o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
        o.stop(audioCtx.currentTime + 0.13);
    } catch(e){}
}

/* =============================================================== MODAL */
function showModal(html, actions, isEnding){
    $('modal-content').innerHTML = html;
    const actWrap = $('modal-actions'); actWrap.innerHTML = '';
    (actions||[]).forEach(a=>{
        const b = document.createElement('button');
        b.className = 'modal-btn ' + (a.cls||'primary'); b.textContent = a.label;
        b.addEventListener('click', a.fn); actWrap.appendChild(b);
    });
    $('modal-overlay').hidden = false;
}
function closeModal(){ $('modal-overlay').hidden = true; }

function modalOffline(earned, hrs){
    showModal(`
        <div class="modal-kicker">While you were away</div>
        <h1>The rent kept coming 💤</h1>
        <p>You logged off for <b>${hrs<1 ? Math.round(hrs*60)+' minutes' : hrs.toFixed(1)+' hours'}</b>. The tenants did not get that option.</p>
        <p>Net cashflow banked: <b>${money(earned)}</b>, and your properties quietly appreciated while you slept. Scrutiny cooled as the news cycle found a new villain.</p>
    `, [{ label:'Excellent', cls:'primary', fn:()=> closeModal() }]);
}

function modalIntro(){
    showModal(`
        <div class="modal-kicker">PortfolioMax™ · New investor onboarding</div>
        <h1>Welcome aboard 🏠</h1>
        <p style="font-size:1.05em;">Congratulations on taking control of your financial future — and, incidentally, a few other people's. Your first deposit is ready. Your tenants are already home.</p>
        <p>Buy low, rent high, and let the bank carry the risk. Squeeze where you can, donate where it counts, and if a reporter rings, you're "unavailable." Do it well enough and they'll put you in charge of fixing the very thing you're doing.</p>
        <p style="color:var(--muted);font-size:.9em;">Past performance is a lovely three-bedroom you'll never own. PortfolioMax™ accepts no responsibility for the housing crisis — though we do gratefully accept the rent.</p>
    `, [
        { label:'How does this work?', cls:'ghost', fn:()=> modalHelp() },
        { label:'Start squeezing →', cls:'primary', fn:()=> closeModal() },
    ]);
}
function modalHelp(){
    showModal(`
        <div class="modal-kicker">How to build an empire</div>
        <h1>The loop 🔁</h1>
        <p><b>1. Buy on leverage.</b> You don't pay cash for houses — you put down a <b>deposit</b> (investors ~35%) and the bank lends the rest as a mortgage. The debt costs weekly interest, so cheap provincial stock earns, while Auckland &amp; prestige homes <span style="color:var(--red-dark)">bleed cash</span> — you buy those for the capital gain.</p>
        <p><b>2. The bank is the game.</b> It lends up to <b>7× your income</b>, counting ~78% of your rent — so every rent rise unlocks more borrowing. (A first-home buyer gets 6× and counts none of it. That's the joke, and the mechanic.) New builds dodge the limits entirely.</p>
        <p><b>3. Squeeze (the 💸 Squeeze tab).</b> Raise rents and invent fees for cash — and borrowing power. Every squeeze raises <span style="color:#b25a15;font-weight:700">Scrutiny</span>.</p>
        <p><b>4. Buy Influence (Politics) &amp; hire Services.</b> Turn cash into political capital to spike stories and rewrite the rules. Services are mostly <b>weekly hires</b> — worth it only once they earn their keep. Watch the OCR — a rate hike lifts everyone's mortgage and can trigger the <b>Market Correction</b>.</p>
    `, [{ label:'Let\'s ruin some lives', cls:'primary', fn:()=> closeModal() }]);
}

/* =============================================================== SHARE */
function shareStats(){
    const txt = `🏠 KIWI LANDLORD EMPIRE

I became: ${phaseInfo().name}
💰 Net worth: ${money(netWorth())} (on ${money(state.debt)} of mortgage debt)
🏚️ Properties: ${propertyCount()}  |  Households: ${fmt(state.tenants)}
🔥 Public Scrutiny: ${Math.round(state.heat)}%  |  🏛️ ${influenceTitle()}

Rap sheet:
• Evictions ordered: ${state.evictions}
• Healthy Homes ignored: ${state.violations}
• Fees invented: ${state.feesInvented}
• Politicians "engaged": ${state.bribes}
• 🏅 Trophies: ${achCount()}/${ACHIEVEMENTS.length}

A satire of NZ's housing crisis. How dirty are your hands?
Play: https://chalkybones.github.io/Landlord-game/`;
    if (navigator.clipboard){
        navigator.clipboard.writeText(txt).then(()=> toast('Rap sheet copied. Share your shame.', 'good'), ()=> alert(txt));
    } else alert(txt);
}

/* ---- Shareable result IMAGE (the viral bit) — rendered client-side to a canvas ---- */
function endingLabel(){
    const E = { minister:'Minister of Housing 🏛️', empire:'The Empire 🥂', expose:'Exposed 💥', collapse:'Margin Called 📉', reform:'The Reformed Landlord 🕊️' };
    return state.ended ? (E[state.endingKind] || phaseInfo().name) : phaseInfo().name;
}
function handsVerdict(){
    if (state.fhbSales >= 3 && state.evictions === 0) return { label:'THE REFORMED LANDLORD', emoji:'🕊️' };
    const dirt = state.evictions*3 + state.violations*2 + state.feesInvented + state.bribes*2;
    if (dirt <= 2)  return { label:'SUSPICIOUSLY CLEAN', emoji:'😇' };
    if (dirt <= 10) return { label:'A BIT GRUBBY', emoji:'😬' };
    if (dirt <= 25) return { label:'PROPERLY FILTHY', emoji:'😈' };
    if (dirt <= 55) return { label:'UTTERLY COMPROMISED', emoji:'🦹' };
    return { label:'SLUMLORD SUPREME', emoji:'👑' };
}
function _rr(g,x,y,w,h,r){ g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
function _wrapC(g,text,cx,y,maxW,lineH){
    const words=String(text).split(' '); let line='', lines=[];
    for (const w of words){ const t = line? line+' '+w : w; if (g.measureText(t).width > maxW && line){ lines.push(line); line=w; } else line=t; }
    if (line) lines.push(line);
    lines.forEach((ln,i)=> g.fillText(ln, cx, y + i*lineH));
    return lines.length;
}
function renderShareCard(){
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
    const g = c.getContext('2d');
    const F = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    let bg = g.createLinearGradient(0,0,900,1080);
    bg.addColorStop(0,'#063b3e'); bg.addColorStop(.55,'#044f54'); bg.addColorStop(1,'#02696e');
    g.fillStyle=bg; g.fillRect(0,0,1080,1080);
    let r1 = g.createRadialGradient(1000,90,40,1000,90,720); r1.addColorStop(0,'rgba(23,162,162,.38)'); r1.addColorStop(1,'rgba(23,162,162,0)'); g.fillStyle=r1; g.fillRect(0,0,1080,1080);
    let r2 = g.createRadialGradient(70,1050,40,70,1050,680); r2.addColorStop(0,'rgba(224,165,0,.30)'); r2.addColorStop(1,'rgba(224,165,0,0)'); g.fillStyle=r2; g.fillRect(0,0,1080,1080);

    g.textBaseline='alphabetic';
    g.textAlign='left'; g.fillStyle='#fff'; g.font=`800 46px ${F}`; g.fillText('🏠 PortfolioMax™', 70, 104);
    g.fillStyle='rgba(255,255,255,.55)'; g.font=`700 23px ${F}`; g.fillText('KIWI LANDLORD EMPIRE · A SATIRE OF NZ HOUSING', 70, 142);

    g.textAlign='center';
    g.fillStyle='#f2c94c'; g.font=`800 30px ${F}`; g.fillText(state.ended ? 'FINAL STANDING' : 'I GOT TO', 540, 252);
    g.fillStyle='#fff'; g.font=`800 74px ${F}`; _wrapC(g, endingLabel(), 540, 336, 950, 80);

    g.fillStyle='rgba(255,255,255,.55)'; g.font=`800 25px ${F}`; g.fillText('EMPIRE VALUE', 540, 472);
    g.fillStyle='#8ff0bd'; g.font=`800 104px ${F}`; g.fillText(money(netWorth()), 540, 566);

    const stats = [
        ['Properties', String(propertyCount())],
        ['Households', fmt(state.tenants)],
        ['Evictions', String(state.evictions)],
        ['Standards ignored', String(state.violations)],
        ['Fees invented', String(state.feesInvented)],
        ['🏅 Rap sheet', achCount()+'/'+ACHIEVEMENTS.length],
    ];
    const gx=70, gy=616, gap=22, gw=(940-2*gap)/3, gh=104;
    stats.forEach((s,i)=>{
        const x = gx + (i%3)*(gw+gap), y = gy + ((i/3)|0)*(gh+gap);
        g.fillStyle='rgba(255,255,255,.08)'; _rr(g,x,y,gw,gh,16); g.fill();
        g.strokeStyle='rgba(255,255,255,.15)'; g.lineWidth=1.5; _rr(g,x,y,gw,gh,16); g.stroke();
        g.textAlign='center';
        g.fillStyle='#fff'; g.font=`800 44px ${F}`; g.fillText(s[1], x+gw/2, y+56);
        g.fillStyle='rgba(255,255,255,.6)'; g.font=`700 19px ${F}`; g.fillText(s[0].toUpperCase(), x+gw/2, y+86);
    });

    const v = handsVerdict();
    g.textAlign='center';
    g.fillStyle='rgba(255,255,255,.6)'; g.font=`800 27px ${F}`; g.fillText('HOW DIRTY ARE YOUR HANDS?', 540, 928);
    g.fillStyle='#ffd77a'; g.font=`800 56px ${F}`; g.fillText(v.emoji+'  '+v.label, 540, 992);
    g.fillStyle='rgba(255,255,255,.72)'; g.font=`700 26px ${F}`; g.fillText('Play free · chalkybones.github.io/Landlord-game', 540, 1048);
    return c;
}
function shareCard(){
    let canvas;
    try { canvas = renderShareCard(); } catch(e){ shareStats(); return; }
    const caption = "How dirty are your hands? 🏠 Kiwi Landlord Empire — a satire of NZ's housing crisis. Play free: https://chalkybones.github.io/Landlord-game/";
    canvas.toBlob(async (blob)=>{
        if (!blob){ shareStats(); return; }
        const file = new File([blob], 'kiwi-landlord-empire.png', { type:'image/png' });
        if (navigator.canShare && navigator.canShare({ files:[file] })){
            try { await navigator.share({ files:[file], text:caption }); return; }
            catch(e){ if (e && e.name === 'AbortError') return; }  // user cancelled
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href=url; a.download='kiwi-landlord-empire.png';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(()=> URL.revokeObjectURL(url), 4000);
        if (navigator.clipboard) navigator.clipboard.writeText(caption).catch(()=>{});
        toast('Card saved 📸 — post it to r/newzealand.', 'good');
    }, 'image/png');
}

/* =============================================================== RESET */
function resetGame(){
    showModal(`
        <div class="modal-kicker">Danger</div>
        <h1>Reset the empire? ☠</h1>
        <p>Every property, tenant, bribe and ill-gotten dollar — gone. A clean slate you absolutely do not deserve.</p>
    `, [
        { label:'Keep my empire', cls:'ghost', fn:()=> closeModal() },
        { label:'Burn it down', cls:'gold', fn:()=> hardReset() },
    ]);
}
function hardReset(){
    localStorage.removeItem(CFG.SAVE_KEY);
    localStorage.removeItem('kiwiLandlordEmpire');
    location.reload();
}

/* =============================================================== SPEED / MUTE / QTY */
function setSpeed(s){ state.speed = s; state.lastUpdate = now(); setSpeedButtons(); }
function setSpeedButtons(){
    document.querySelectorAll('.speed-btn').forEach(b=> b.classList.toggle('active', parseInt(b.dataset.speed) === state.speed));
}
function setBuyQty(q){
    state.buyQty = q;
    document.querySelectorAll('.qty-btn').forEach(b=> b.classList.toggle('active', b.dataset.qty === String(q)));
    refresh();
}
function toggleMute(){ state.muted = !state.muted; $('mute-btn').textContent = state.muted ? '🔇' : '🔊'; }

/* =============================================================== COACH / GUIDANCE */
function selectTab(name){
    const tabBtn = document.querySelector(`.tab[data-tab="${name}"]`);
    if (!tabBtn || tabBtn.hidden) return;
    document.querySelectorAll('.tab').forEach(t=> t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p=> p.classList.remove('active'));
    tabBtn.classList.add('active');
    const panel = document.querySelector(`.tab-panel[data-panel="${name}"]`);
    if (panel) panel.classList.add('active');
    if (name === 'news'){ state._unread = 0; const b = tabBtn.querySelector('.badge'); if (b) b.remove(); }
    scrollToEl('.tab-body');
}
function scrollToEl(sel){
    const el = document.querySelector(sel); if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 10;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}

/* progressive disclosure — reveal tabs/systems only as they become relevant */
function updateUnlocks(){
    const u = state.unlocked, props = propertyCount();
    const reveal = (key, cond, label) => {
        const tab = document.querySelector(`.tab[data-tab="${key}"]`);
        if (!u[key] && cond){
            u[key] = true;
            if (tab){ tab.classList.add('just-unlocked'); setTimeout(()=>{ if (tab) tab.classList.remove('just-unlocked'); }, 1900); }
            if (label) toast(`🔓 Unlocked: ${label}`, 'gold');
        }
        if (tab) tab.hidden = !u[key];
    };
    reveal('operations', props>=1, 'Squeeze — raise rents & invent fees');
    reveal('news',       props>=1, 'News feed');
    reveal('services',   props>=3, 'Services — hire the professionals');
    reveal('politics',   state._everHot || state.influence>0 || props>=4, 'Politics — buy your way out of scrutiny');
    const ts = $('tenants-strip'); if (ts) ts.hidden = props < 1;
}

/* the single most useful next action, given the whole game state */
function coachStep(){
    const s = state, props = propertyCount(), tier = heatTier().i, ph = phaseInfo().i;
    if (tier >= 3 && s.influence < 60)
        return { text:"🔥 The press is circling. Go to Politics and spend Influence to spike the story — before the exposé drops.", tab:'politics' };
    if (props === 0)
        return { text:"Buy your first rental below — it's your income, and the borrowing power to buy the next one. 👇", tab:'portfolio' };
    if (s.rentRaises === 0)
        return { text:"Squeeze your tenant: hit “Raise the rent 💢” for a cash hit. Watch the strain bar — ease off before it redlines, or they walk.", scroll:'#tenants-strip' };
    if (props === 1)
        return { text:"One's a hobby, two's a portfolio. Buy another rental — owning more unlocks bigger, better properties.", tab:'portfolio' };
    if (s.feesInvented === 0 && s.money < 60000)
        return { text:"Cash a bit tight? In Squeeze, “Invent a Fee.” It's not a letting fee — it's an “administration contribution.”", tab:'operations' };
    if (tier >= 2 && s.influence < 40)
        return { text:"People are noticing. Duck into Politics and turn some cash into Influence before it gets loud.", tab:'politics' };
    if (s.money > 75000 && canAffordAnyProperty())
        return { text:"You've got cash sitting there doing nothing evil. Buy another rental and put it to work.", tab:'portfolio' };
    if (props >= 3 && !anyHireEngaged() && grossRentWeekly() > 3000)
        return { text:"Your rent roll's big enough that a Property Manager would pay for itself. Have a look in Services.", tab:'services' };
    if (ph >= 4 && s.influence < 520)
        return { text:"You're one move from the top. Bank Influence in Politics — the Kāinga Ora board seat is the win.", tab:'politics' };
    if (ph >= 4)
        return { text:"Take the Kāinga Ora board seat in Politics. Become the Minister. Poacher, meet gamekeeper.", tab:'politics' };
    return { text:"Keep buying, keep squeezing, keep your scrutiny down. Every rung is closer to Minister.", tab:'portfolio' };
}
function canAffordAnyProperty(){ return PROPERTIES.some(p => propertyCount() >= p.unlock && plannedBuy(p).n >= 1); }
function anyHireEngaged(){ return SERVICES.some(sv => sv.kind === 'hire' && state.upgrades[sv.id]); }
let _coachStep = null;
function updateCoach(){
    const step = coachStep();
    const el = $('coach-step'); if (!el) return;
    if (!_coachStep || _coachStep.text !== step.text){
        el.textContent = step.text;
        el.classList.remove('coach-pop'); void el.offsetWidth; el.classList.add('coach-pop');
    }
    _coachStep = step;
    const cta = $('coach-cta'); if (cta) cta.hidden = !(step.tab || step.scroll);
}

/* =============================================================== REFRESH */
function refresh(){
    $('money').textContent = money(state.money);
    const cf = netCashflow();
    const cfEl = $('income-rate');
    cfEl.textContent = (cf<0?'−':'+') + money(Math.abs(cf)) + '/wk';
    cfEl.style.color = cf < 0 ? 'var(--red)' : 'var(--green)';
    $('networth').textContent = `Net worth ${money(netWorth())} · Debt ${money(state.debt)}`;

    const ph = phaseInfo();
    $('phase-name').textContent = ph.name;
    if (state._phaseSeen === undefined) state._phaseSeen = ph.i;
    if (ph.i > state._phaseSeen){
        state._phaseSeen = ph.i;
        toast(`📈 You are now: ${ph.name}`, 'gold');
        addNews(`You've ascended to <b>${ph.name}</b>. The circles you move in now have valet parking and worse ethics.`, 'event');
        blip(420); confetti(70);
    } else if (ph.i < state._phaseSeen) state._phaseSeen = ph.i;

    const unlocked = unlockedTierCount();
    if (state._unlockedSeen === undefined) state._unlockedSeen = unlocked;
    if (unlocked > state._unlockedSeen){
        for (let i=state._unlockedSeen; i<unlocked; i++){ const p = PROPERTIES[i]; if (p) toast(`🔓 New asset class: ${p.name}`, 'good'); }
        state._unlockedSeen = unlocked;
    }

    const tier = heatTier();
    $('scrutiny-fill').style.width = state.heat + '%';
    $('scrutiny-tier').textContent = tier.trend;
    $('scrutiny-foot').textContent = tier.foot;
    document.querySelector('.scrutiny-tile').classList.toggle('hot', state.heat >= 80);
    document.body.classList.toggle('redline', state.heat >= 85);   // danger vignette
    if (tier.i >= 3 && !state._crisisSeen){
        state._crisisSeen = true; shake();
        toast('🔥 The press is circling. Spend influence to cool it — or lose the lot.', 'bad');
    } else if (tier.i < 3) state._crisisSeen = false;

    $('influence').textContent = fmt(state.influence);
    $('influence-title').textContent = influenceTitle();

    // bank strip
    const room = borrowable();
    const bh = $('bank-headroom');
    if (bh){
        bh.textContent = propertyCount() === 0
            ? `🏦 Put ~35% down and the bank funds the rest — a deal a first-home buyer can't get`
            : (room >= 1000 ? `🏦 The bank will lend you ${money(room)} more`
                            : `🏦 Bank tapped out — lift your rent roll (or let values rise) to borrow more`);
        const rel = $('bank-release');
        if (rel){ rel.disabled = room < 1000; rel.textContent = room >= 1000 ? `Release ${money(room)}` : 'No equity to release'; }
        const rateEl = $('bank-rate');
        if (rateEl) rateEl.textContent = `Mortgage rate ${(state.rate*100).toFixed(2)}% · you owe ${money(state.debt)}`;
    }

    // nemesis dossier strip
    const dstrip = $('dossier-strip');
    if (dstrip){
        const active = state.dossier > 0.5 || state._dossierChapter > 0;
        dstrip.hidden = !active;
        if (active){
            $('dossier-pct').textContent = Math.round(state.dossier) + '%';
            $('dossier-fill').style.width = clamp(state.dossier,0,100) + '%';
            const lines = ['Investigative reporter. Can\'t be bought. That\'s the problem.',
                DOSSIER_CHAPTERS[0].line, DOSSIER_CHAPTERS[1].line, DOSSIER_CHAPTERS[2].line, DOSSIER_CHAPTERS[3].line];
            $('dossier-chapter').textContent = lines[state._dossierChapter] || lines[0];
            dstrip.classList.toggle('hot', state.dossier >= 72);
        }
    }

    for (let i=0;i<updaters.length;i++) updaters[i]();
    updateTenantStrain();
    updatePrestigeButton();
    checkAchievements();
    updateUnlocks();
    updateCoach();
}

/* =============================================================== LOOP */
function tick(){
    const t = now();
    let dt = (t - state.lastUpdate) / 1000;
    state.lastUpdate = t;
    if (state.speed === 0 || state.ended) return;
    if (dt > 1) dt = 1;
    const weeksElapsed = dt / state.speed;
    state.money += netCashflow() * weeksElapsed;
    state.weekFrac += weeksElapsed;
    let guard = 0;
    while (state.weekFrac >= 1 && guard < 50){
        state.weekFrac -= 1; onWeek(); guard++;
        if (state.ended) return;
    }
    checkPassiveEndings();
    refresh();
}

/* =============================================================== INIT */
function setupEvents(){
    document.querySelectorAll('.tab').forEach(tab=> tab.addEventListener('click', ()=> selectTab(tab.dataset.tab)));
    const cta = $('coach-cta');
    if (cta) cta.addEventListener('click', ()=>{
        if (!_coachStep) return;
        if (_coachStep.tab) selectTab(_coachStep.tab);
        else if (_coachStep.scroll) scrollToEl(_coachStep.scroll);
    });
    document.querySelectorAll('.speed-btn').forEach(b=> b.addEventListener('click', ()=> setSpeed(parseInt(b.dataset.speed))));
    document.querySelectorAll('.qty-btn').forEach(b=> b.addEventListener('click', ()=> setBuyQty(b.dataset.qty === 'max' ? 'max' : parseInt(b.dataset.qty))));
    $('save-game').addEventListener('click', ()=> saveGame(false));
    const rap = $('rapsheet-btn'); if (rap) rap.addEventListener('click', modalRapSheet);
    $('share-stats').addEventListener('click', shareCard);
    $('reset-game').addEventListener('click', resetGame);
    $('prestige-btn').addEventListener('click', doPrestige);
    $('mute-btn').addEventListener('click', toggleMute);
    $('help-btn').addEventListener('click', modalHelp);
    const objHow = $('obj-how'); if (objHow) objHow.addEventListener('click', modalHelp);
    const rel = $('bank-release'); if (rel) rel.addEventListener('click', (e)=> releaseEquity(e));
    $('modal-overlay').addEventListener('click', (e)=>{ if (e.target === $('modal-overlay') && !state.ended && !_dilemmaOpen) closeModal(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !state.ended && !_dilemmaOpen) closeModal(); });
}

function init(){
    const had = loadGame();
    state._phaseSeen = phaseInfo().i;
    state._unlockedSeen = unlockedTierCount();
    syncTenants();
    if (had) offlineProgress();
    buildAll();
    // seed the live ticker so it scrolls from the first frame
    for (let i=0;i<5;i++){ const h = _stripHtml(pickHeadline()); if (_tickerItems.indexOf(h) === -1) _tickerItems.push(h); }
    renderTicker();
    setupEvents();
    setSpeedButtons();
    setBuyQty(state.buyQty || 1);
    $('mute-btn').textContent = state.muted ? '🔇' : '🔊';
    refresh();
    setInterval(tick, 100);
    showAd();
    setInterval(showAd, 13000);
    const adEl = $('ad-banner'); if (adEl) adEl.addEventListener('click', adClick);
    setInterval(()=> saveGame(true), 20000);
    window.addEventListener('beforeunload', ()=> saveGame(true));
    if (state.ended){
        // the save persisted a finished game — re-show the end screen instead of a frozen board
        state.speed = 0; setSpeedButtons();
        setTimeout(()=> showEndingModal(state.endingKind || 'empire'), 300);
    } else if (!had){
        setTimeout(modalIntro, 400);
    }
}

init();
