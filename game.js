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
    NEWS_COOLDOWN: 8,
    EVENT_COOLDOWN: 6,
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
      cost:(s)=> 90000, spendInfl:200, infl:260,
      desc:'No official channel, no paper trail — just a mate\'s number and "you around?" It worked for that 2024 board appointment nobody was allowed to ask about.',
      news:s => `A Cabinet-level problem resolved by text, in the grand tradition of an appointment that bypassed the usual process entirely.` },

    { id:'board', emoji:'🏛️', name:'Get onto the Kāinga Ora Board', political:true, need:{infl:520, phase:4},
      cost:(s)=> 500000, spendInfl:500, ending:'minister',
      desc:'Bill English reviewed KO and found it "not financially viable." The fix, obviously, is a commercial mind like yours. You are the arson and the insurance claim.',
      news:s => `You are appointed to govern the housing agency you spent years plundering. Poacher, meet gamekeeper; gamekeeper, meet governance stipend.` },
];

const PARTIES = ['National (for the tax cuts)','Labour (hedging the CGT)','ACT (for the red-tape bonfire)','NZ First (for the vibes)','whoever wins on 7 November'];

/* ------------------------------------------------------------------ SERVICES */
const SERVICES = [
    { id:'propManager', emoji:'👔', name:'Property Manager', cost:40000,
      desc:'They handle the tenants so you never see one. +25% rent — and they invent the fees on your behalf, with a clear conscience they bill you for.',
      tag:'+25% rent' },
    { id:'rentAlgo', emoji:'🤖', name:'Rent-Setting Algorithm', cost:280000, need:{phase:1},
      desc:'The algorithm sets every rent to the maximum the data allows. Nobody decided. Nobody\'s responsible. It\'s just the number. +40% rent.',
      tag:'+40% rent' },
    { id:'compliance', emoji:'📋', name:'Healthy Homes "Compliance" Consultant', cost:120000,
      desc:'Certifies your compliance with the standards — mandatory since July 2025 — that you are actively ignoring. Halves the heat from ignoring them.',
      tag:'Ignore-standards heat ×0.5' },
    { id:'methKit', emoji:'🧪', name:'Meth-Test Concierge', cost:90000,
      desc:'The new meth rules (16 Apr 2026) set the "contaminated" line at 15µg. You test constantly, bill the tenant, and above 30µg you get to evict them too.',
      tag:'+$16/household/wk' },
    { id:'accomSupp', emoji:'🏦', name:'Accommodation Supplement Harvester', cost:320000, need:{phase:1},
      desc:'The state spends ~$2b a year topping up the rents you set — so you set them higher. The subsidy lands in your account. Thanks, taxpayer.',
      tag:'+$24/household/wk' },
    { id:'tribunal', emoji:'📚', name:'Tenancy Tribunal Season Pass', cost:200000,
      desc:'Frequent-flyer status at the Tribunal. Renters United built a free tool to fight you (TenancyHelp); you built a lawyer on retainer. Guess who wins.',
      tag:'Eviction heat ×0.5' },
    { id:'astroturf', emoji:'📣', name:'Astroturf "Renters\' Group"', cost:400000, need:{phase:2},
      desc:'A "grassroots" tenant voice that mysteriously agrees with landlords. The grass is plastic, the roots are yours, the press releases are quarterly.',
      tag:'All heat ×0.75' },
    { id:'prFirm', emoji:'📰', name:'PR Crisis Firm on Retainer', cost:550000, need:{phase:2},
      desc:'On call to reframe "slumlord" as "provider of essential services." The news cycle is three days long; they make sure you outlast it.',
      tag:'Scrutiny decays fast' },
    { id:'lobbyist', emoji:'📞', name:'Lobbyist on Speed-Dial', cost:800000, need:{phase:3},
      desc:'Your problems become their policy. Every optimisation you perform now also earns political influence. The Planning Bill has your fingerprints, gloved.',
      tag:'Operations grant influence' },
    { id:'trust', emoji:'🏛️', name:'Family Trust Restructure', cost:1200000, need:{phase:3},
      desc:'Nothing is technically yours anymore — which is why nothing is technically your fault. Brightline can\'t see you. Unlocks Restructuring.',
      tag:'Unlocks Restructure' },
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
const T_FIRST = ['Aroha','Wiremu','Mereana','Josh','Kirsty','Tama','Ana','Dylan','Sina','Manaia','Charlotte','Rangi','Priya','Beau','Hine','Cody','Fetu','Grace','Nikau','Chloe','Ropata','Sam','Moana','Kane','Anika','Tané'];
const T_LAST  = ['Ngata','Williams','Patel','Tuilagi','Thompson','Rewiti','Chen','O\'Brien','Faleolo','Harris','Whitcombe','Kaur','Mafi','Baker','Wallace','Hohepa','Singh','Katoa','Reid','Marsh','Nguyen','Solomona'];
const T_JOB = [
    'ED nurse, night shifts','Primary school teacher','Supermarket 2IC','Barista + Uber, both',
    'Aged-care worker','Apprentice sparky','Bus driver','Solo mum, two kids','Three uni students (a "flat")',
    'Warehouse picker','Chef, 55-hr weeks','Palliative care nurse','Call-centre team','Retail, zero-hours',
    'Council parks crew','Beneficiary + part-time','Truckie, long-haul','Kōhanga reo kaiako','Early-childhood teacher',
];
const T_SITUATION = [
    'Their flatmate left for Brisbane; now they cover the whole $__ alone.',
    'Rent finally dropped $20 — the flat is still cold, still damp, now emptier.',
    'On the Kāinga Ora "Priority One" list for 3 years. Their number is still four digits.',
    'The Winter Energy Payment lasts nine days. The single lounge heat pump does the rest, poorly.',
    'Pays $__ for a "consent-free minor dwelling" — a shed with ambitions.',
    'Heat pump died in June. You replied in spring: "have you tried the Winter Energy Payment?"',
    'Third flat in two years. Every landlord "needed it for family."',
    'Charged a "tenancy administration contribution." That\'s a letting fee. Those are illegal. Apparently it\'s "admin."',
    'The kids share a room with the dehumidifier. It has the best mattress.',
    'Applied against 40 others for this damp one-bed and "won." The prize is the damp one-bed.',
    'Combined income $180k. Bank lends them 6×; the house costs 11×. The gap is officially called "patience."',
    'Got a two-week pet bond for a budgie. The budgie now has stronger tenancy rights than they do.',
    'Wrote you a lovely email about the mould. You screenshotted it to your accountant.',
    'Priced out to Papakura; commutes 90 minutes each way to the job still stuck in town.',
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
];

/* ----------------------------------------------------------------------- ADS
   "Sponsored" fake brands — GTA-flavoured flat posters, but NZ-housing real.
   Rotate in a banner and occasionally drop into the news feed. */
const ADS = [
    { logo:'🏦', brand:'Fleeca Home Loans', hue:'teal',
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
    PROPERTIES.forEach(p => props[p.id] = { count: 0, cost: p.price });
    return {
        v: 2,
        money: CFG.START_CASH,
        debt: 0,               // total mortgage owed
        dtiDebt: 0,            // debt that counts against the DTI cap (excludes new-build)
        basis: 0,              // sum of prices paid (cost basis for valuation)
        marketIndex: 1,        // portfolio value = basis × marketIndex
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
        weekFrac: 0,
        muted: false,
        evictions: 0, rentRaises: 0, violations: 0, bribes: 0,
        feesInvented: 0, fhbSales: 0, heatMaxStreak: 0, ended: false,
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
/* legacy alias — ops/events/squeeze scale off this positive number */
function weeklyIncome(){ return grossRentWeekly(); }

function operatingWeekly(){
    const m = multipliers();
    let op = 0;
    PROPERTIES.forEach(p => op += state.properties[p.id].count * p.rent * (1 - p.costRate));
    op *= m.rent;
    op += state.tenants * m.passivePerTenant;
    return op;
}
function interestWeekly(){ return state.debt * state.rate / 52; }
/* actual money-in-the-bank change per week (can be negative — negative gearing) */
function netCashflow(){ return operatingWeekly() - interestWeekly(); }

function assessableIncome(){ return CFG.BASE_INCOME + CFG.RENT_SHADE * grossRentWeekly() * 52; }
function maxDebtDTI(){ return CFG.DTI * assessableIncome(); }
function dtiHeadroom(){ return Math.max(0, maxDebtDTI() - state.dtiDebt); }

function portfolioValue(){ return state.basis * state.marketIndex; }
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
        state = Object.assign(defaultState(), loaded);
        PROPERTIES.forEach(p => {
            if (!state.properties[p.id]) state.properties[p.id] = { count:0, cost:p.price };
            state.properties[p.id].cost = p.price;   // prices are fixed — heal any legacy escalated value
        });
        if (typeof state.dtiDebt !== 'number') state.dtiDebt = state.debt || 0;
        if (typeof state.basis !== 'number') state.basis = 0;
        state.upgrades = state.upgrades || {};
        state.onceUsed = state.onceUsed || {};
        state.featured = state.featured || [];
        if (!state.buyQty) state.buyQty = 1;
        if (!state.rate) state.rate = CFG.MORTGAGE_RATE;
        if (!state.marketIndex) state.marketIndex = 1;
        return true;
    } catch(e){ state = defaultState(); return false; }
}
function offlineProgress(){
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
        card.className = 'buy-card';
        card.innerHTML = `
            <div class="buy-card-head">
                <span class="buy-title"><span class="buy-emoji">${sv.emoji}</span> ${sv.name}</span>
            </div>
            <div class="buy-desc">${sv.desc}</div>
            <div class="buy-stats"><span class="tag money">${sv.tag}</span></div>
            <div class="lock-note" data-lock hidden></div>
            <button class="buy-btn" data-buy>Purchase</button>`;
        list.appendChild(card);
        const btn = card.querySelector('[data-buy]');
        btn.addEventListener('click', (e)=> buyService(sv, e));
        updaters.push(()=>{
            const owned = !!state.upgrades[sv.id];
            card.classList.toggle('owned-service', owned);
            const lock = card.querySelector('[data-lock]');
            const gate = meetsNeed(sv.need);
            if (owned){
                card.classList.remove('locked'); lock.hidden = true;
                btn.className = 'buy-btn owned'; btn.disabled = true; btn.textContent = '✓ Retained';
            } else if (!gate.ok){
                card.classList.add('locked'); lock.hidden = false; lock.textContent = '🔒 ' + gate.why;
                btn.disabled = true; btn.textContent = 'Locked';
            } else {
                card.classList.remove('locked'); lock.hidden = true;
                btn.className = 'buy-btn'; btn.disabled = state.money < sv.cost;
                btn.textContent = `Purchase — ${money(sv.cost)}`;
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
function makeTenant(){
    const first = pick(T_FIRST), last = pick(T_LAST);
    const rent = 420 + Math.floor(Math.random()*10)*35;
    const sit = pick(T_SITUATION).replace('$__', '$'+rent);
    return { name:`${first} ${last}`, job:pick(T_JOB), rent, strain: 20 + Math.floor(Math.random()*28), situation: sit, emoji: pick(['🧑','👩','👨','🧑‍🦱','👵','👨‍🦰','🧕','👩‍🦰','🧑‍🦳']) };
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
            <div class="tenant-rent">Rent: <span class="rent-num">${money(t.rent)}/wk</span></div>
            <div class="strain-meter"><div class="strain-fill" data-strain></div></div>
            <div class="strain-label" data-strainlabel></div>
            <button class="tenant-btn" data-squeeze>Raise their rent 💢</button>`;
        wrap.appendChild(card);
        card.querySelector('[data-squeeze]').addEventListener('click', (e)=> squeezeTenant(idx, e));
        card.querySelector('[data-strain]').style.width = t.strain + '%';
        card.querySelector('[data-strainlabel]').textContent = strainWord(t.strain);
    });
}
function updateTenantStrain(){
    const cards = $('tenant-cards').querySelectorAll('.tenant-card');
    cards.forEach((c, i)=>{
        const t = state.featured[i]; if (!t) return;
        const bar = c.querySelector('[data-strain]');
        if (bar) bar.style.width = clamp(t.strain,0,100) + '%';
        const lbl = c.querySelector('[data-strainlabel]');
        if (lbl) lbl.textContent = strainWord(t.strain);
    });
}
function strainWord(s){
    if (s >= 92) return 'At breaking point';
    if (s >= 70) return 'Struggling badly';
    if (s >= 45) return 'Feeling the squeeze';
    if (s >= 20) return 'Just coping';
    return 'Holding on';
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
    state.basis += plan.n * p.price;

    fx('−'+money(plan.deposit)+' down', 'neg', e);
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
    } else if (op.cost){
        fx('−'+money(op.cost), 'neg', e);
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
    if (op.sell){ const sc = sellTopProperty(op.sell === 'cost'); if (sc) fx('+'+money(sc), 'pos', e); }
    if (op.fhb){ state.fhbSales++; checkRedemption(); }

    if (op.strain) state.featured.forEach(t=> t.strain = clamp(t.strain + op.strain, 0, 100));

    if (op.news) addNews(op.news(state), op.heat < 0 ? 'good' : 'bad');
    blip(op.heat < 0 ? 320 : 200);
    if (syncTenants()) renderTenants();
    refresh();
}

/* sell one unit of the priciest owned type; clears its share of the mortgage.
   'market' realises current value (appreciation included); 'cost' sells at the
   price you paid (you forgo the gain). No windfall premium — that was an
   arbitrage: 35% down + a >1× sale = buy-then-flip infinite money. */
function sellTopProperty(atCost){
    let best = 0, id = null;
    PROPERTIES.forEach(p=>{ if (state.properties[p.id].count>0 && p.price>best){ best=p.price; id=p.id; } });
    if (!id) return 0;
    const p = PROPERTIES.find(x=>x.id===id);
    const sale = atCost ? p.price : p.price * state.marketIndex;
    const loanShare = Math.min(state.debt, p.price * (1 - p.deposit));
    const cashOut = Math.max(0, sale - loanShare);
    state.properties[id].count--;
    state.debt = Math.max(0, state.debt - loanShare);
    if (!p.newBuild) state.dtiDebt = Math.max(0, state.dtiDebt - loanShare);
    state.basis = Math.max(0, state.basis - p.price);
    state.money += cashOut;
    return cashOut;
}

function evictSomeone(){
    if (state.featured.length === 0) return;
    const idx = Math.floor(Math.random()*state.featured.length);
    const t = state.featured[idx];
    const card = $('tenant-cards').children[idx];
    if (card) card.classList.add('breaking');
    addNews(`${t.name} (${t.job}) — evicted. Boxes on the verge, kids in the car, a fresh listing already live at +18%.`, 'bad');
    state.featured[idx] = makeTenant();
    setTimeout(renderTenants, 260);
}

function squeezeTenant(idx, e){
    const t = state.featured[idx]; if (!t) return;
    const bump = 25 + Math.floor(Math.random()*30);
    t.rent += bump; t.strain = clamp(t.strain + 18 + Math.floor(Math.random()*14), 0, 100);
    state.money += bump * 4 + grossRentWeekly() * 0.2;
    state.rentRaises++;
    fx('+'+money(bump*4 + grossRentWeekly()*0.2), 'pos', e);
    addHeat(3 * multipliers().heatGen, e);
    blip(220);

    if (t.strain >= 100){
        if (Math.random() < 0.25){
            addNews(`${t.name} somehow made rent — took a third job and stopped answering the door. You call this "resilience."`, 'bad');
            t.strain = 82; renderTenants();
        } else {
            state.evictions++;
            state.money += Math.max(4000, grossRentWeekly()*0.8);
            addHeat(10 * multipliers().heatGen, e);
            const card = $('tenant-cards').children[idx];
            if (card) card.classList.add('breaking');
            addNews(`${t.name} couldn't keep up. Evicted, re-let same week at market. The Minister files it under "supply."`, 'bad');
            state.featured[idx] = makeTenant();
            setTimeout(renderTenants, 260);
        }
    } else {
        addNews(`Rent raised on ${t.name.split(' ')[0]} by ${money(bump)}/wk. "Market adjustment," you explain to no one who asked.`, 'bad');
        renderTenants();
    }
    refresh();
}

function buyService(sv, e){
    if (state.upgrades[sv.id] || state.money < sv.cost) return;
    if (!meetsNeed(sv.need).ok) return;
    state.money -= sv.cost;
    state.upgrades[sv.id] = true;
    fx('−'+money(sv.cost), 'neg', e);
    blip(300);
    toast(`Retained: ${sv.name}. Working for you, against everyone else, forever.`, 'good');
    addNews(`Engaged "${sv.name}." An offshore accountant somewhere feels a warm glow.`, 'event');
    if (sv.id === 'trust') updatePrestigeButton();
    refresh();
}

function doPolitics(pa, e){
    const cost = pa.cost(state);
    if (state.money < cost) return;
    if (!meetsNeed(pa.need).ok) return;
    if (pa.spendInfl && state.influence < pa.spendInfl) return;
    state.money -= cost;
    fx('−'+money(cost), 'neg', e);
    if (pa.spendInfl){ state.influence -= pa.spendInfl; fx('−'+pa.spendInfl+' infl', 'neg', e); }
    if (pa.infl){ addInfluence(pa.infl, e); }
    if (pa.heat){ addHeat(pa.heat, e); }
    if (pa.permHeatDown){ state.permHeatMult *= pa.permHeatDown; }
    if (pa.once){ state.onceUsed[pa.id] = true; }
    if (pa.id === 'bribe' || pa.id === 'donate' || pa.id === 'textMinister') state.bribes++;
    blip(260);
    if (pa.ending){ addNews(pa.news(state), 'event'); refresh(); setTimeout(()=> triggerEnding(pa.ending), 500); return; }
    addNews(pa.news(state), pa.heat < 0 ? 'good' : 'event');
    refresh();
}

function addHeat(delta, e){
    if (!delta) return;
    state.heat = clamp(state.heat + delta, 0, CFG.HEAT_MAX);
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
    state.featured.forEach(t=>{ t.strain = clamp(t.strain + (Math.random()<0.5?0.4:0), 0, 100); });

    const nowS = now()/1000;
    if (nowS - (state._lastNews||0) > CFG.NEWS_COOLDOWN && Math.random() < 0.35){
        addNews(pick(HEADLINES)); state._lastNews = nowS;
    }
    // occasional "sponsored" drop between the headlines (radio-ad energy)
    if (nowS - (state._lastAd||0) > 22 && Math.random() < 0.12){
        const ad = pick(ADS);
        addNews(`<span class="spon-tag">SPONSORED</span> <b>${ad.brand}</b> — ${ad.tagline} <span class="spon-fine">${ad.fine}</span>`, 'sponsored');
        state._lastAd = nowS;
    }
    const eventProb = 0.03 + (state.heat/100) * 0.4;
    if (nowS - (state._lastEvent||0) > CFG.EVENT_COOLDOWN && Math.random() < eventProb){
        rollEvent(); state._lastEvent = nowS;
    }
    if (state.heat >= CFG.HEAT_MAX - 1 && state.influence < 200){
        state.heatMaxStreak++;
        if (state.heatMaxStreak >= 3){ triggerEnding('expose'); return; }
    } else state.heatMaxStreak = 0;
}

function setRate(delta, label){
    state.rate = clamp(state.rate + delta, CFG.RATE_MIN, CFG.RATE_MAX);
}

function rollEvent(){
    const tier = heatTier().i;
    const pool = EVENTS.filter(ev => ev.tier <= tier && (!ev.cond || ev.cond()));
    if (pool.length === 0) return;
    pick(pool).run();
    refresh();
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
        state.marketIndex *= 0.92;
        addNews(`📉 EVENT: Market correction — values slide 8% as the "recovery" stalls. Your equity thins and the over-leveraged wobble. Debt, however, does not shrink.`, 'bad');
    }},
    { tier:3, cond:()=> state.tenants>=6, run(){
        const loss = Math.floor(grossRentWeekly()*3); state.money -= loss; addHeat(5);
        addNews(`✊ EVENT: RENT STRIKE. Your tenants collectively withhold. −${money(loss)} while they hold the line and you hold your breath.`, 'bad');
    }},
    { tier:3, run(){
        addHeat(4);
        addNews(`📣 EVENT: Protesters outside your Remuera villa with a banner: "HOUSES ARE FOR LIVING IN." You draw the curtains (imported, blockout).`, 'bad');
    }},
];

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
    state.ended = true; state.speed = 0; setSpeedButtons();

    const stats = `
        <div class="stat-grid">
            <div>Properties<b>${propertyCount()}</b></div>
            <div>Households<b>${fmt(state.tenants)}</b></div>
            <div>Net worth<b>${money(netWorth())}</b></div>
            <div>Mortgage debt<b>${money(state.debt)}</b></div>
            <div>Evictions ordered<b>${state.evictions}</b></div>
            <div>Healthy Homes ignored<b>${state.violations}</b></div>
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
            body:`<p>You couldn't buy the silence fast enough. RNZ, Stuff and The Spinoff dropped it the same morning: the mould, the fees, the pregnant tenant, the rat droppings, the boat named "Yield."</p>
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
        { label:'Share result 📣', cls:'gold', fn:()=>{ shareStats(); } },
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
                           lifetime: state.lifetimeInfluence, muted: state.muted, buyQty: state.buyQty };
            state = defaultState();
            state.upgrades = keep.upgrades; state.legacy = keep.legacy; state.influence = keep.influence;
            state.lifetimeInfluence = keep.lifetime; state.muted = keep.muted; state.buyQty = keep.buyQty;
            state._phaseSeen = 0; state._unlockedSeen = unlockedTierCount();
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
        <p><b>4. Buy Influence (Politics) &amp; Retain Services.</b> Turn cash into political capital to spike stories and rewrite the rules. Watch the OCR — a rate hike lifts everyone's mortgage and can trigger the <b>Market Correction</b>.</p>
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

A satire of NZ's housing crisis. How dirty are your hands?
Play: https://chalkybones.github.io/Landlord-game/`;
    if (navigator.clipboard){
        navigator.clipboard.writeText(txt).then(()=> toast('Rap sheet copied. Share your shame.', 'good'), ()=> alert(txt));
    } else alert(txt);
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
        blip(420);
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

    for (let i=0;i<updaters.length;i++) updaters[i]();
    updateTenantStrain();
    updatePrestigeButton();
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
    document.querySelectorAll('.tab').forEach(tab=>{
        tab.addEventListener('click', ()=>{
            document.querySelectorAll('.tab').forEach(t=> t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p=> p.classList.remove('active'));
            tab.classList.add('active');
            document.querySelector(`.tab-panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
            if (tab.dataset.tab === 'news'){ state._unread = 0; const b = tab.querySelector('.badge'); if (b) b.remove(); }
            // on phones, jump to the freshly-selected content (bottom-bar nav)
            if (window.innerWidth <= 700){
                const body = document.querySelector('.tab-body');
                if (body){ const y = body.getBoundingClientRect().top + window.scrollY - 6; window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' }); }
            }
        });
    });
    document.querySelectorAll('.speed-btn').forEach(b=> b.addEventListener('click', ()=> setSpeed(parseInt(b.dataset.speed))));
    document.querySelectorAll('.qty-btn').forEach(b=> b.addEventListener('click', ()=> setBuyQty(b.dataset.qty === 'max' ? 'max' : parseInt(b.dataset.qty))));
    $('save-game').addEventListener('click', ()=> saveGame(false));
    $('share-stats').addEventListener('click', shareStats);
    $('reset-game').addEventListener('click', resetGame);
    $('prestige-btn').addEventListener('click', doPrestige);
    $('mute-btn').addEventListener('click', toggleMute);
    $('help-btn').addEventListener('click', modalHelp);
    const objHow = $('obj-how'); if (objHow) objHow.addEventListener('click', modalHelp);
    const rel = $('bank-release'); if (rel) rel.addEventListener('click', (e)=> releaseEquity(e));
    $('modal-overlay').addEventListener('click', (e)=>{ if (e.target === $('modal-overlay') && !state.ended) closeModal(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && !state.ended) closeModal(); });
}

function init(){
    const had = loadGame();
    state._phaseSeen = phaseInfo().i;
    state._unlockedSeen = unlockedTierCount();
    syncTenants();
    if (had) offlineProgress();
    buildAll();
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
    if (!had) setTimeout(modalIntro, 400);
}

init();
