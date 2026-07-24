/* ==========================================================================
   KIWI LANDLORD EMPIRE  —  "PortfolioMax™"   (Election Year Edition, 2026)
   A satire of Aotearoa's housing crisis.

   The loop:  squeeze tenants -> cash -> buy influence -> suppress scrutiny
              & deregulate -> squeeze harder.  Wealth buys the immunity that
              lets the extraction escalate. That's the joke. It's also the game.

   Content is current to mid-2026: the OCR whiplash, rents falling because
   everyone left for Brisbane, the golden-visa reversal, consent-free granny
   flats, the Kāinga Ora selloff, pet bonds, "Landlord Parliament", the
   7 November election. Everything is data-driven — add to the tables below.
   ========================================================================== */

'use strict';

/* ------------------------------------------------------------------ CONFIG */
const CFG = {
    START_CASH: 50000,
    DEFAULT_SPEED: 5,          // real seconds per in-game week
    BASE_HEAT_DECAY: 2.5,      // scrutiny lost per week with no help
    HEAT_MAX: 100,
    OFFLINE_CAP_HOURS: 8,
    NEWS_COOLDOWN: 8,          // min real seconds between random headlines
    EVENT_COOLDOWN: 6,         // min real seconds between random events
    SAVE_KEY: 'kiwiLandlordEmpire_v1',
    LEGACY_BONUS: 0.15,        // +15% permanent rent per Restructure
};

/* ---------------------------------------------------------------- PROPERTIES
   The clicker backbone. Cheap early, unlocks come fast, curve stays smooth. */
const PROPERTIES = [
    { id:'moldyFlat',  emoji:'🍄', name:'Mouldy Studio Flat',        cost:14000,     income:180,   units:1,  mult:1.13, unlock:0,
      desc:'"Warm and dry," says the listing — a phrase now legally required and freely ignored. The warmth is the mould\'s.' },
    { id:'exState',    emoji:'🏚️', name:'Ex–Kāinga Ora State House', cost:60000,     income:560,   units:1,  mult:1.15, unlock:3,
      desc:'KO is selling ~900 state homes a year since the Bill English review. You bought one and tripled the rent. Public asset, private yield.' },
    { id:'leaky',      emoji:'💧', name:"Leaky Building 'Opportunity'", cost:260000,  income:1700,  units:3,  mult:1.16, unlock:6,
      desc:'The body corporate is at war and the cladding is a crime scene. Brightline\'s two years now, so you can flip it before the rot votes.' },
    { id:'sausage',    emoji:'🌭', name:'Granny-Flat Sausage Block',  cost:850000,    income:4600,  units:6,  mult:1.18, unlock:10,
      desc:'70m² of consent-free "minor dwelling" per backyard, no council, no questions, since 15 Jan 2026. Six of them where a lawn used to be.' },
    { id:'shoebox',    emoji:'📦', name:'CBD Shoebox Apartments',    cost:2600000,   income:12000, units:12, mult:1.20, unlock:15,
      desc:'12m², no window, "vibrant inner-city lifestyle." MDRS is optional now, so the density is entirely your own idea.' },
    { id:'block',      emoji:'🏢', name:'Entire Apartment Block',    cost:8500000,   income:34000, units:30, mult:1.22, unlock:22,
      desc:'You are now the whole street. Residents call it home; the spreadsheet calls it stock; the RMA replacement calls it "enabled."' },
    { id:'retirement', emoji:'👵', name:'Retirement Village',        cost:30000000,  income:110000,units:80, mult:1.24, unlock:32,
      desc:'Deferred management fees: you keep a cut of the resale of a home they never owned, forever. The last legal perpetual-motion machine.' },
];

/* ---------------------------------------------------------------- OPERATIONS
   Active "revenue optimisation." Each trades a little Scrutiny for cash.
   money: function(state, m) -> $ gained now. rentBoost: permanent rent × add. */
const OPERATIONS = [
    { id:'optimiseRent', emoji:'📈', name:'Optimise Rents', heat:6, needTenants:true,
      desc:'A modest, market-aligned adjustment — even as national rents fall, because your tenants can\'t all move to Brisbane at once.',
      rentBoost:0.025, strain:14,
      news:s => `Rents "optimised" while the market drops. Asked how, you cite "costs." Yours. Emotional ones.` },

    { id:'inventFee', emoji:'🧾', name:'Invent a Fee', heat:3, needTenants:true,
      money:(s,m)=> Math.max(3000, weeklyIncome()*0.9),
      desc:'Letting fees have been illegal since 2018, so this is a "tenancy administration contribution" — which is different, because you renamed it.',
      news:s => { const f=pick(FEES); return `New charge introduced: ${f}. Legally grey, morally charcoal, financially excellent.`; } },

    { id:'ignoreHealthy', emoji:'🦠', name:'Ignore Healthy Homes', heat:9, needTenants:true, heatKey:'compliance',
      money:(s,m)=> s.tenants*300 + 4000, strain:6,
      desc:'Compliance was mandatory for every rental from 1 July 2025. About 18% of rentals are still cold and damp. Be the 18%.',
      news:s => `Healthy Homes deadline treated as a strong suggestion. Mould reclassified as "a natural feature of the character home."` },

    { id:'noCause', emoji:'📜', name:'90-Day No-Cause Eviction', heat:14, needTenants:true, heatKey:'tribunal', infl:4,
      money:(s,m)=> Math.max(8000, weeklyIncome()*1.5), evicts:true,
      desc:'No-cause terminations came back on 30 Jan 2025 — "open season on renters," said Renters United. No reason required. That\'s the product.',
      news:s => `Tenant requests a repair, receives a 90-day no-cause notice instead. Re-let same day at market. The Minister files it under "supply."` },

    { id:'airbnb', emoji:'🧳', name:'Convert to Airbnb', heat:11, needTenants:true, cost:5000,
      money:(s,m)=> weeklyIncome()*2.2 + 10000, removesHousehold:true,
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
      sellTop:2.2,
      desc:'The foreign-buyer ban was part-lifted in early 2026: Active Investor Plus migrants may buy $5m+ homes. ~40% are Americans wanting a "Plan B."',
      news:s => `$5m villa sold to an offshore investor-migrant as a doomsday bunker. It stays dark. Spain scrapped its golden visa over this; we mailed ours a fruit basket.` },

    // Redemption path — appears only while your hands are relatively clean.
    { id:'sellFHB', emoji:'🕊️', name:'Sell to the Tenants (at cost)', heat:-18, sellTop:1.0, fhb:true,
      needProperty:2, hideIf:s => s.evictions>0 || heatTier().i>=2,
      desc:'Sell a home to the family living in it, for what you paid — forgoing the golden-visa premium. You lose yield. They lose the fear.',
      news:s => `Landlord sells to sitting tenants at cost. NZPIF calls him "unwell." The tenants call him the best they ever had — a devastating review of everyone else.` },
];

/* fee & pet flavour */
const FEES = [
    '"Tenancy administration contribution" (a letting fee wearing a moustache)',
    '"Healthy Homes compliance levy" (for compliance not performed)',
    '"Winter heat-pump servicing surcharge" (the heat pump does not work)',
    '"Rates recovery fee" (you already deduct the rates)',
    '"Bond lodgement processing fee" (lodging the bond is the law)',
    '"After-hours maintenance surcharge" (there is no maintenance)',
    '"Rent payment convenience fee" (for the convenience of paying rent)',
    '"Garden aesthetic levy" (there is no garden)',
];
const PETS = ['goldfish','budgie','hamster','tortoise','cat that visits sometimes','elderly, blameless labrador'];

/* ------------------------------------------------------------------ POLITICS
   Convert cash -> influence, and influence -> less scrutiny / rewritten rules. */
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

/* ------------------------------------------------------------------ SERVICES
   Permanent upgrades. Bought once, working forever. The real progression. */
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

/* -------------------------------------------------------------------- PHASES
   Derived from net worth. Drives the title and the tone. */
const PHASES = [
    { min:0,          name:'Generation Rent Refugee' },
    { min:150000,     name:'Mum & Dad Investor' },
    { min:900000,     name:'Portfolio Landlord' },
    { min:4000000,    name:'Property Mogul' },
    { min:16000000,   name:'Housing Spokesperson' },
    { min:60000000,   name:'Shadow Housing Minister' },
    { min:200000000,  name:'The Minister' },
];

/* --------------------------------------------------------- INFLUENCE TITLES */
const INFLUENCE_TITLES = [
    { min:0,    name:'Nobody' },
    { min:60,   name:'Local Nuisance' },
    { min:180,  name:'Councillor\'s Contact' },
    { min:400,  name:'Party Donor (Bronze)' },
    { min:800,  name:'NZPIF Life Member' },
    { min:1500, name:'Coalition Whisperer' },
    { min:3000, name:'Kingmaker' },
];

/* ------------------------------------------------------------ SCRUTINY TIERS
   Higher mins than v1 so early experimentation is safe and fun. */
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
    'Combined income $180k. DTI says borrow 6×; the house costs 11×. The gap is officially called "patience."',
    'Got a two-week pet bond for a budgie. The budgie now has stronger tenancy rights than they do.',
    'Wrote you a lovely email about the mould. You screenshotted it to your accountant.',
    'Priced out to Papakura; commutes 90 minutes each way to the job still stuck in town.',
];

/* ------------------------------------------------------------------- HEADLINES
   Deadpan, current to mid-2026. The gap between tone and content is the joke. */
const HEADLINES = [
    'OCR hiked to 2.50% — after six straight cuts — because petrol sneezed. First-home buyers, told last month the coast was clear, quietly sit back down.',
    'Rents fall a second month. Economists cheer. Reason: everyone\'s flatmate moved to Brisbane, where the rent is also unpayable but the wages aren\'t a dare.',
    'Finance Minister says social-housing tenants have "won the Lotto." Later regrets "reaching for the wrong metaphor" — not, notably, the policy.',
    'Investigation finds government MPs bought 25 more rentals AFTER passing pro-landlord reforms. MPs describe this as "believing in the asset class."',
    'Granny flats up to 70m² now consent-free. Backyards nationwide sprout "minor dwellings"; the lawn is declared a failed asset.',
    'Kāinga Ora, found "not financially viable," sells another 900 state homes. The waitlist, unbothered, remains four digits.',
    'Foreign-buyer ban part-lifted: golden-visa migrants may buy $5m+ homes. ~40% are Americans buying a "Plan B." Locals keep buying "a flat, eventually, maybe."',
    'Median house price $795k — still 18% below the 2021 bubble. Buyers praised for their "patience," i.e. their continued inability to afford anything.',
    'CPI back to 4.1%, above the band, on a 27% petrol spike. RBNZ spent 18 months cutting rates to save borrowers, then undoes it in one meeting.',
    'DTI rules cap borrowing at 6× income for homes that cost 8–11× income. The maths, officials confirm, is "aspirational."',
    'Dunedin students move into a flat with "vomit up the walls and buckets on the lawn." Landlord keeps the $2,400 bond, offers no reason, cites no law (there is one).',
    'No-cause 90-day evictions, restored last year, described by landlords as "essential" — and by 8.2% of them as something they would "actually use."',
    'Pet bonds now legal. Landlord charges two weeks\' rent for a goldfish. The goldfish is listed as co-signer.',
    'Accommodation Supplement tips over $2 billion a year. A review finds it mostly reaches landlords, who call this "working as intended."',
    'Election set for 7 November. Cost of living and housing top every poll; every party vows to fix it; the houses remain exactly where they are.',
    'Labour campaigns on a 28% capital gains tax (not the family home). Property investors discover a sudden, profound interest in "the family home."',
    'Greens call it a "cost of greed crisis" and propose rent controls. The landlord lobby warns the market "would be destroyed" — a market it also describes as thriving.',
    'Interest deductibility fully restored for landlords; net investor buying intentions hit a decade high. "Anyone can do this," says a man doing it with tax breaks.',
    'Auckland median rent eases to $635/wk. The flat is still cold, damp and mouldy — just cheaper and emptier now. Progress.',
    'RMA to be replaced by two bills totalling 900 pages "to cut red tape." Consultants report record demand for help understanding the red-tape reduction.',
    'Housing Minister concedes a social-rent hike was based on "no particular science," just what felt "appropriate." Tenants confirm it feels like a lot.',
    'Auckland rough sleeping doubles to ~940. Emergency-housing numbers fall — helped by staff whose performance targets depend on the numbers falling.',
    'MDRS density made optional. Councils that wanted fewer homes are now legally permitted to want fewer homes. Bold.',
    'Net 37,000 citizens leave for good; 63% pick Australia. The population still grows — new arrivals fill the seats still warm from the Brisbane flight.',
    'UK bans no-fault evictions in May; Ireland has 1,777 rentals in the entire country. NZ, surveying the field, restores no-fault evictions.',
    'Cheapest one-year fixed now 4.65%. "Refix anxiety" enters the vernacular. Landlords forward the cost to tenants and the blame to the RBNZ.',
    'OneRoof declares "the death of the Kiwi do-up": buy ugly, not broken. The broken ones, naturally, become rentals.',
    'Renters United launches a free tool to auto-draft Tribunal letters. The landlord lobby launches a longer sigh.',
    '"Warm and dry" — the phrase every listing must imply and no rental is required to be.',
    'Investor seminar sells out: "Retire on Their Rent — Deductibility Is Back, Baby." The nurse in row six is here by mistake; she thought it was a job fair.',
];

/* --------------------------------------------------------------------- STATE */
let state;

function defaultState() {
    const props = {};
    PROPERTIES.forEach(p => props[p.id] = { count: 0, cost: p.cost });
    return {
        v: 2,
        money: CFG.START_CASH,
        heat: 0,
        influence: 0,
        lifetimeInfluence: 0,
        rentMultBonus: 0,      // additive permanent bonus from optimise/subdivide
        extraUnits: 0,         // extra households from subdivide / airbnb
        legacy: 0,             // prestige tiers
        permHeatMult: 1,       // from weakenLaw (stacking)
        properties: props,
        upgrades: {},          // serviceId -> true
        onceUsed: {},          // reserved for one-shot actions
        tenants: 0,
        featured: [],          // named tenant objects
        speed: CFG.DEFAULT_SPEED,
        buyQty: 1,             // 1 | 10 | 'max'
        lastUpdate: now(),
        weekFrac: 0,
        muted: false,
        // stats
        evictions: 0,
        rentRaises: 0,
        violations: 0,
        bribes: 0,
        feesInvented: 0,
        fhbSales: 0,
        heatMaxStreak: 0,
        ended: false,
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

function weeklyIncome(){
    const m = multipliers();
    let rent = 0;
    PROPERTIES.forEach(p => rent += state.properties[p.id].count * p.income);
    rent *= m.rent;
    rent += state.tenants * m.passivePerTenant;
    return Math.max(0, rent);
}

function propertyCount(){
    let n = 0;
    PROPERTIES.forEach(p => n += state.properties[p.id].count);
    return n;
}

function netWorth(){
    let w = state.money;
    PROPERTIES.forEach(p => {
        const base = p.cost;
        w += state.properties[p.id].count * base * 1.1;
    });
    return w;
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

/* bulk-buy maths (cost sequence is floored each step, matching buyProperty) */
function costForN(nextCost, mult, n){
    let total = 0, c = nextCost;
    for (let i=0;i<n;i++){ total += c; c = Math.floor(c*mult); }
    return total;
}
function maxAffordableN(nextCost, mult, cash){
    let n = 0, c = nextCost, total = 0;
    while (total + c <= cash && n < 5000){ total += c; c = Math.floor(c*mult); n++; }
    return n;
}
function plannedBuy(prop){
    const st = state.properties[prop.id];
    if (state.buyQty === 'max'){
        const n = maxAffordableN(st.cost, prop.mult, state.money);
        return { n, cost: costForN(st.cost, prop.mult, Math.max(1,n)) };
    }
    const n = state.buyQty;
    return { n, cost: costForN(st.cost, prop.mult, n) };
}

/* ============================================================ SAVE / LOAD */
function saveGame(silent){
    try {
        state.lastUpdate = now();
        localStorage.setItem(CFG.SAVE_KEY, JSON.stringify(state));
        if (!silent) toast('Empire saved. Preserved for the tribunal.', 'good');
    } catch(e){ /* storage full / disabled */ }
}

function loadGame(){
    let raw = localStorage.getItem(CFG.SAVE_KEY);
    if (!raw) raw = localStorage.getItem('kiwiLandlordEmpire');
    if (!raw){ state = defaultState(); return false; }
    try {
        const loaded = JSON.parse(raw);
        state = Object.assign(defaultState(), loaded);
        PROPERTIES.forEach(p => { if (!state.properties[p.id]) state.properties[p.id] = { count:0, cost:p.cost }; });
        state.upgrades = state.upgrades || {};
        state.onceUsed = state.onceUsed || {};
        state.featured = state.featured || [];
        if (!state.buyQty) state.buyQty = 1;
        if (state.money < 1000 && propertyCount() === 0) state.money = CFG.START_CASH;
        return true;
    } catch(e){ state = defaultState(); return false; }
}

function offlineProgress(){
    const elapsed = (now() - (state.lastUpdate || now())) / 1000;
    if (elapsed < 30) return;
    const capped = Math.min(elapsed, CFG.OFFLINE_CAP_HOURS * 3600);
    const weeks = capped / CFG.DEFAULT_SPEED;
    const earned = weeklyIncome() * weeks;
    if (earned > 1){
        state.money += earned;
        state.heat = clamp(state.heat - multipliers().heatDecay * weeks, 0, CFG.HEAT_MAX);
        const hrs = capped/3600;
        setTimeout(()=> modalOffline(earned, hrs), 400);
    }
}

/* =============================================================== RENDERING */
const updaters = [];   // per-item refresh closures

function buildAll(){
    updaters.length = 0;
    buildProperties();
    buildOperations();
    buildServices();
    buildPolitics();
    renderTenants();
    renderNews(true);
}

/* ---- Properties ---- */
function buildProperties(){
    const list = $('properties-list');
    list.innerHTML = '';
    PROPERTIES.forEach(p=>{
        const card = document.createElement('div');
        card.className = 'buy-card';
        card.innerHTML = `
            <div class="buy-card-head">
                <span class="buy-title"><span class="buy-emoji">${p.emoji}</span> ${p.name}</span>
                <span class="buy-count" data-count>Owned 0</span>
            </div>
            <div class="buy-desc">${p.desc}</div>
            <div class="buy-stats">
                <span>Rent <b data-rent></b>/wk</span>
                <span>+<b>${p.units}</b> household${p.units>1?'s':''}</span>
            </div>
            <div class="lock-note" data-lock hidden></div>
            <button class="buy-btn" data-buy>Acquire</button>`;
        list.appendChild(card);
        const btn = card.querySelector('[data-buy]');
        btn.addEventListener('click', (e)=> buyProperty(p.id, e));

        updaters.push(()=>{
            const st = state.properties[p.id];
            const unlocked = propertyCount() >= p.unlock;
            card.classList.toggle('locked', !unlocked);
            card.querySelector('[data-count]').textContent = 'Owned ' + st.count;
            card.querySelector('[data-rent]').textContent = money(p.income * multipliers().rent);
            const lock = card.querySelector('[data-lock]');
            if (!unlocked){
                lock.hidden = false;
                lock.textContent = `🔒 Unlocks at ${p.unlock} properties owned`;
                btn.disabled = true;
                btn.textContent = 'Locked';
                return;
            }
            lock.hidden = true;
            const plan = plannedBuy(p);
            if (state.buyQty === 'max'){
                btn.disabled = plan.n < 1;
                btn.textContent = plan.n >= 1 ? `Acquire ×${plan.n} — ${money(plan.cost)}` : `Need ${money(st.cost)}`;
            } else {
                btn.disabled = state.money < plan.cost;
                btn.textContent = state.money < plan.cost ? `Need ${money(plan.cost)}` : `Acquire ×${plan.n} — ${money(plan.cost)}`;
            }
        });
    });
}

/* ---- Operations ---- */
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
    if (op.sellTop) t.push(`<span class="tag money">sell @ ${op.sellTop}×</span>`);
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

/* ---- Services ---- */
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
                card.classList.remove('locked');
                lock.hidden = true;
                btn.className = 'buy-btn owned';
                btn.disabled = true;
                btn.textContent = '✓ Retained';
            } else if (!gate.ok){
                card.classList.add('locked');
                lock.hidden = false;
                lock.textContent = '🔒 ' + gate.why;
                btn.disabled = true;
                btn.textContent = 'Locked';
            } else {
                card.classList.remove('locked');
                lock.hidden = true;
                btn.className = 'buy-btn';
                btn.disabled = state.money < sv.cost;
                btn.textContent = `Purchase — ${money(sv.cost)}`;
            }
        });
    });
}

/* ---- Politics ---- */
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
            const tags = [];
            tags.push(`<span class="tag cost">−${money(cost)}</span>`);
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
    if (need.phase && phaseInfo().i < need.phase)
        return { ok:false, why:`Requires ${PHASES[need.phase].name}` };
    if (need.infl && state.influence < need.infl)
        return { ok:false, why:`Requires ${need.infl} influence on hand` };
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
    if (plan.n < 1 || state.money < plan.cost) return;

    state.money -= plan.cost;
    for (let i=0;i<plan.n;i++){ st.count++; st.cost = Math.floor(st.cost * p.mult); }
    fx('−'+money(plan.cost), 'neg', e);
    blip(180);
    const label = plan.n > 1 ? `${plan.n} more ${p.name.toLowerCase()}s` : `another ${p.name.toLowerCase()}`;
    addNews(`You acquired ${label}. Somewhere, a first-home buyer refreshes TradeMe, sees the price, and quietly closes the tab.`, 'bad');
    if (syncTenants()) renderTenants();
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
    if (op.sellTop){ sellTopProperty(op.sellTop); }
    if (op.fhb){ state.fhbSales++; checkRedemption(); }

    if (op.strain) state.featured.forEach(t=> t.strain = clamp(t.strain + op.strain, 0, 100));

    if (op.news) addNews(op.news(state), op.heat < 0 ? 'good' : 'bad');
    blip(op.heat < 0 ? 320 : 200);
    if (syncTenants()) renderTenants();
    refresh();
}

function sellTopProperty(mult){
    let best = 0, id = null;
    PROPERTIES.forEach(p=>{ if (state.properties[p.id].count>0 && p.cost>best){ best=p.cost; id=p.id; } });
    if (!id) return;
    const p = PROPERTIES.find(x=>x.id===id);
    state.properties[id].count--;
    if (mult>0) state.money += Math.floor(p.cost * mult);
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
    state.money += bump * 4 + weeklyIncome() * 0.2;
    state.rentRaises++;
    fx('+'+money(bump*4 + weeklyIncome()*0.2), 'pos', e);
    addHeat(3 * multipliers().heatGen, e);
    blip(220);

    if (t.strain >= 100){
        if (Math.random() < 0.25){
            addNews(`${t.name} somehow made rent — took a third job and stopped answering the door. You call this "resilience."`, 'bad');
            t.strain = 82;
            renderTenants();
        } else {
            state.evictions++;
            state.money += Math.max(4000, weeklyIncome()*0.8);
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

/* ------------------------------------------------------- resource mutators */
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
    state.featured.forEach(t=>{ t.strain = clamp(t.strain + (Math.random()<0.5?0.4:0), 0, 100); });

    const nowS = now()/1000;
    if (nowS - (state._lastNews||0) > CFG.NEWS_COOLDOWN && Math.random() < 0.35){
        addNews(pick(HEADLINES));
        state._lastNews = nowS;
    }

    const eventProb = 0.03 + (state.heat/100) * 0.4;
    if (nowS - (state._lastEvent||0) > CFG.EVENT_COOLDOWN && Math.random() < eventProb){
        rollEvent();
        state._lastEvent = nowS;
    }

    if (state.heat >= CFG.HEAT_MAX - 1 && state.influence < 200){
        state.heatMaxStreak++;
        if (state.heatMaxStreak >= 3){ triggerEnding('expose'); return; }
    } else {
        state.heatMaxStreak = 0;
    }
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
        const b = Math.floor(weeklyIncome()*0.6);
        state.money += b;
        addNews(`✅ EVENT: Interest deductibility refund lands. The tax break you lobbied for now pays for the lobbying. +${money(b)}.`, 'good');
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
            const fine = state.tenants*900 + 5000;
            state.money -= fine; addHeat(6);
            addNews(`⚠️ EVENT: Healthy Homes inspection FAILED (mandatory since July 2025). Fined ${money(fine)}. Should've bought the consultant, not the jet-ski.`, 'bad');
        }
    }},
    { tier:1, run(){
        const c = propertyCount()*700 + 2000;
        state.money -= c;
        addNews(`⚠️ EVENT: RBNZ hikes the OCR again on petrol-driven inflation. Your floating rate jumps ${money(c)}/wk. You forward the cost to tenants and the blame to Wellington.`, 'bad');
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
            const pay = 4000 + state.tenants*200;
            state.money -= pay; addHeat(4);
            addNews(`⚖️ EVENT: Tribunal orders you to repay ${money(pay)} in unlawful fees. You appeal, on principle (of keeping the money).`, 'bad');
        }
    }},
    { tier:2, cond:()=> state.tenants>=4, run(){
        const loss = Math.floor(weeklyIncome()*1.5);
        state.money -= loss;
        addNews(`✈️ EVENT: Two households emigrate to Brisbane mid-tenancy. Rents are falling and you "can't find good tenants" — a record 43% of landlords agree. −${money(loss)} in voids.`, 'bad');
    }},

    /* ---- crisis (tier 3) ---- */
    { tier:3, run(){
        if (state.influence >= 150){
            state.influence -= 60;
            addNews(`🛡️ EVENT: An exposé loads — then a minister calls you "a valued housing provider" on Morning Report and the story dies mid-sentence. −60 influence, well spent.`, 'event');
        } else {
            state.heat = clamp(state.heat+6,0,100);
            state.influence = Math.max(0, state.influence-40);
            addNews(`💥 EVENT: The Spinoff runs "Landlord Parliament" — the investors who bought 25 rentals after writing the rules — and you're in the sidebar. The public is, briefly, furious.`, 'bad');
        }
    }},
    { tier:3, cond:()=> state.tenants>=6, run(){
        const loss = Math.floor(weeklyIncome()*3);
        state.money -= loss; addHeat(5);
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
    if (netWorth() >= 250000000){ triggerEnding('empire'); return; }
    if (state.money < -60000){ triggerEnding('collapse'); return; }
}

function checkRedemption(){
    if (state.fhbSales >= 3 && state.evictions === 0){ triggerEnding('reform'); }
}

function triggerEnding(kind){
    if (state.ended) return;
    state.ended = true;
    state.speed = 0;
    setSpeedButtons();

    const stats = `
        <div class="stat-grid">
            <div>Properties<b>${propertyCount()}</b></div>
            <div>Households<b>${fmt(state.tenants)}</b></div>
            <div>Net worth<b>${money(netWorth())}</b></div>
            <div>Influence<b>${influenceTitle()}</b></div>
            <div>Evictions ordered<b>${state.evictions}</b></div>
            <div>Healthy Homes ignored<b>${state.violations}</b></div>
        </div>`;

    const E = {
        minister: { kicker:'Ending — The Coronation', title:'Minister of Housing 🏛️',
            body:`<p>You've been appointed to govern the housing system you spent the whole game strip-mining — the Kāinga Ora board, secured the modern way: a text to a mate, no Cabinet, no questions.</p>
                  <p>A landlord with <b>${state.evictions} evictions</b> and <b>${state.violations} ignored standards</b> now sets the rules, writes the RMA replacement, AND — as a bonus portfolio — is the country's chief lawyer. Poacher, gamekeeper, and the judge. You go on the news to say the answer is "supply" and "getting government out of the way." Reporters nod. In a car parked outside, a nurse reads it and turns the engine on for warmth.</p>
                  <p>The irony is so dense you could subdivide it. Consent-free, obviously.</p>` },
        empire: { kicker:'Ending — Total Victory', title:'The Empire 🏢',
            body:`<p>A quarter of a billion dollars. You own so much of Aotearoa that "landlord" undersells it — you're a weather system.</p>
                  <p>First-home buyers gave up a generation ago; the median first-buyer is now 40. Renting is simply the condition of being alive here, and you are the condition. You won capitalism. The prize is that everyone else lost, and pays you monthly for the privilege — right up until they board the Brisbane flight.</p>` },
        expose: { kicker:'Ending — The Reckoning', title:'The Exposé 💥',
            body:`<p>You couldn't buy the silence fast enough. RNZ, Stuff and The Spinoff dropped it the same morning: the mould, the fees, the pregnant tenant, the rat droppings, the boat named "Yield."</p>
                  <p>With <b>${state.evictions} evictions</b> and <b>${state.violations} ignored standards</b> on the record and not enough influence to make it vanish, the Tribunal moved, the banks blinked, and the portfolio came apart. Turns out the immunity was rented too. You missed a payment.</p>` },
        collapse: { kicker:'Ending — Margin Call', title:'The Market Correction 📉',
            body:`<p>You leveraged into the sky and the sky sent a bill. The RBNZ, having cut rates six times, hiked them the moment petrol flinched — and the "recovery" everyone promised in 2026 turned out to be a landing with the wheels up.</p>
                  <p>Refix anxiety became refix reality. You declared bankruptcy owing <b>${money(-state.money)}</b>. Every eviction, every bribe, every fee — and the maths still found you. The homes get sold to another you. The tenants don't even get to change the locks.</p>` },
        reform: { kicker:'Ending — The Secret One', title:'The Reformed Landlord 🕊️',
            body:`<p>You sold the homes to the families living in them, at cost, and never evicted a soul. Property forums call you "compromised." NZPIF revokes your membership. The tenants call you the best landlord they ever had — a devastating indictment of all the others.</p>
                  <p>Here's the twist the game owes you: it barely moved the market. A few families housed; the crisis didn't notice. No election result fixes this by itself, and neither does one decent landlord. Individual virtue is lovely, and it is not policy.</p>
                  <p>You did a good thing anyway. That has to count for something — even if the spreadsheet, and the country, carry on as if it didn't.</p>` },
    };

    const e = E[kind] || E.empire;
    showModal(`
        <div class="modal-kicker">${e.kicker}</div>
        <h1>${e.title}</h1>
        ${e.body}
        ${stats}
    `, [
        { label:'Share result 📣', cls:'gold', fn:()=>{ shareStats(); } },
        { label:'Play again', cls:'primary', fn:()=>{ hardReset(); } },
    ], true);
}

/* =============================================================== PRESTIGE */
function updatePrestigeButton(){
    const btn = $('prestige-btn');
    const eligible = state.upgrades.trust && netWorth() >= 5000000;
    btn.hidden = !eligible;
}

function doPrestige(){
    const gain = state.legacy + 1;
    showModal(`
        <div class="modal-kicker">Restructure</div>
        <h1>Move it all into the Trust 🏦</h1>
        <p>Liquidate the visible empire. The properties, the cash — gone from your name, which is the point. You keep your <b>political influence</b> (halved) and your <b>Business Services</b>, and you return as a clean-skinned "first-time investor" the banks adore.</p>
        <p>Permanent bonus rises to <b>+${Math.round(gain*CFG.LEGACY_BONUS*100)}% rent</b>, forever. You have faced no consequences. You have simply become harder to see.</p>
    `, [
        { label:'Not yet', cls:'ghost', fn:()=> closeModal() },
        { label:'Restructure', cls:'gold', fn:()=>{
            const keepUpgrades = state.upgrades;
            const keepLegacy = state.legacy + 1;
            const keepInfl = Math.floor(state.influence/2);
            const keepLifetime = state.lifetimeInfluence;
            const muted = state.muted;
            const buyQty = state.buyQty;
            state = defaultState();
            state.upgrades = keepUpgrades;
            state.legacy = keepLegacy;
            state.influence = keepInfl;
            state.lifetimeInfluence = keepLifetime;
            state.muted = muted;
            state.buyQty = buyQty;
            state._phaseSeen = 0;
            state._unlockedSeen = unlockedTierCount();
            syncTenants();
            buildAll();
            closeModal();
            toast(`Restructured. Legacy tier ${keepLegacy}. Nothing is your fault now.`, 'gold');
            refresh();
            saveGame(true);
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
    if (first){ $('news-feed').innerHTML = ''; addNews('Welcome to PortfolioMax™. Election-year wealth-building starts now. Someone has to own the houses — why not you, specifically?', 'event'); }
}

/* =============================================================== JUICE */
function fx(text, cls, e, offsetY){
    if (!e) return;
    if (!e.currentTarget && !e.target && e.clientX === undefined) return;
    const layer = $('fx-layer');
    const span = document.createElement('div');
    span.className = 'fx-num ' + cls;
    span.textContent = text;
    let x, y;
    const tgt = e.currentTarget || e.target;
    if (tgt && tgt.getBoundingClientRect){
        const r = tgt.getBoundingClientRect();
        x = r.left + r.width/2 + (Math.random()*40-20);
        y = r.top + (offsetY||10);
    } else { x = e.clientX; y = e.clientY; }
    span.style.left = x + 'px';
    span.style.top = y + 'px';
    layer.appendChild(span);
    setTimeout(()=> span.remove(), 1150);
}

function toast(text, cls){
    const layer = $('toast-layer');
    const t = document.createElement('div');
    t.className = 'toast' + (cls?' '+cls:'');
    t.textContent = text;
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
        o.type = 'triangle'; o.frequency.value = freq||220;
        g.gain.value = 0.04;
        o.connect(g); g.connect(audioCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
        o.stop(audioCtx.currentTime + 0.13);
    } catch(e){}
}

/* =============================================================== MODAL */
function showModal(html, actions, isEnding){
    $('modal-content').innerHTML = html;
    const actWrap = $('modal-actions');
    actWrap.innerHTML = '';
    (actions||[]).forEach(a=>{
        const b = document.createElement('button');
        b.className = 'modal-btn ' + (a.cls||'primary');
        b.textContent = a.label;
        b.addEventListener('click', a.fn);
        actWrap.appendChild(b);
    });
    $('modal-overlay').hidden = false;
}
function closeModal(){ $('modal-overlay').hidden = true; }

function modalOffline(earned, hrs){
    showModal(`
        <div class="modal-kicker">While you were away</div>
        <h1>The rent kept coming 💤</h1>
        <p>You logged off for <b>${hrs<1 ? Math.round(hrs*60)+' minutes' : hrs.toFixed(1)+' hours'}</b>. The tenants did not get that option.</p>
        <p>Passive income banked: <b>${money(earned)}</b>. Scrutiny cooled while the news cycle moved on to a different villain.</p>
    `, [{ label:'Excellent', cls:'primary', fn:()=> closeModal() }]);
}

function modalIntro(){
    showModal(`
        <div class="modal-kicker">🎮 A satirical idle game · not investment advice</div>
        <h1>Kiwi Landlord Empire</h1>
        <p style="font-size:1.05em;">A satire of Aotearoa's housing crisis, played through <b>PortfolioMax™</b> — a cheerful investor dashboard that reports human misery as good news.</p>
        <p><b>You're the landlord.</b> Buy up homes, squeeze your tenants, and launder your reputation through politics until you're appointed <b>Minister of Housing</b> — all before Public Scrutiny redlines and the exposé ends your run.</p>
        <p style="color:var(--muted);font-size:.9em;">Everything in here is real — the policies, the numbers, the 7 November election. The only fictional part is you. (Well. Hopefully.)</p>
    `, [
        { label:'How to play', cls:'ghost', fn:()=> modalHelp() },
        { label:'Start squeezing →', cls:'primary', fn:()=> closeModal() },
    ]);
}

function modalHelp(){
    showModal(`
        <div class="modal-kicker">How to build an empire</div>
        <h1>The loop 🔁</h1>
        <p><b>1. Acquire property.</b> Passive rent is your base. Each purchase removes a home from the market — that's not a bug. Use the ×1 / ×10 / Max buttons to buy in bulk.</p>
        <p><b>2. Optimise (Operations).</b> Squeeze tenants for cash. Every squeeze raises <span style="color:#b25a15;font-weight:700">Scrutiny</span> — the public heat meter up top.</p>
        <p><b>3. Buy Influence (Politics).</b> Turn cash into political capital, then spend it to <b>Spike the Story</b> and cool your scrutiny before it boils over.</p>
        <p><b>4. Retain Services.</b> Permanent upgrades that let you squeeze harder for less heat. This is where empires are really built.</p>
        <p>Let Scrutiny redline with no influence and the <b>exposé</b> ends you. Play it clean and there's a secret ending — good luck finding the appetite for it. Election's 7 November; the houses won't move either way.</p>
    `, [{ label:'Let\'s ruin some lives', cls:'primary', fn:()=> closeModal() }]);
}

/* =============================================================== SHARE */
function shareStats(){
    const txt = `🏠 KIWI LANDLORD EMPIRE

I became: ${phaseInfo().name}
💰 Net worth: ${money(netWorth())}
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
        navigator.clipboard.writeText(txt).then(
            ()=> toast('Rap sheet copied. Share your shame.', 'good'),
            ()=> { alert(txt); }
        );
    } else { alert(txt); }
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
function setSpeed(s){
    state.speed = s;
    state.lastUpdate = now();
    setSpeedButtons();
}
function setSpeedButtons(){
    document.querySelectorAll('.speed-btn').forEach(b=>{
        b.classList.toggle('active', parseInt(b.dataset.speed) === state.speed);
    });
}
function setBuyQty(q){
    state.buyQty = q;
    document.querySelectorAll('.qty-btn').forEach(b=>{
        b.classList.toggle('active', b.dataset.qty === String(q));
    });
    refresh();
}
function toggleMute(){
    state.muted = !state.muted;
    $('mute-btn').textContent = state.muted ? '🔇' : '🔊';
}

/* =============================================================== REFRESH */
function refresh(){
    $('money').textContent = money(state.money);
    $('income-rate').textContent = '+' + money(weeklyIncome()) + '/wk';
    $('networth').textContent = 'Net worth: ' + money(netWorth());

    const ph = phaseInfo();
    $('phase-name').textContent = ph.name;

    // phase-up celebration
    if (state._phaseSeen === undefined) state._phaseSeen = ph.i;
    if (ph.i > state._phaseSeen){
        state._phaseSeen = ph.i;
        toast(`📈 You are now: ${ph.name}`, 'gold');
        addNews(`You've ascended to <b>${ph.name}</b>. The circles you move in now have valet parking and worse ethics.`, 'event');
        blip(420);
    } else if (ph.i < state._phaseSeen){
        state._phaseSeen = ph.i;
    }

    // new asset class unlocked
    const unlocked = unlockedTierCount();
    if (state._unlockedSeen === undefined) state._unlockedSeen = unlocked;
    if (unlocked > state._unlockedSeen){
        for (let i=state._unlockedSeen; i<unlocked; i++){
            const p = PROPERTIES[i];
            if (p) toast(`🔓 New asset class: ${p.name}`, 'good');
        }
        state._unlockedSeen = unlocked;
    }

    const tier = heatTier();
    $('scrutiny-fill').style.width = state.heat + '%';
    $('scrutiny-tier').textContent = tier.trend;
    $('scrutiny-foot').textContent = tier.foot;
    document.querySelector('.scrutiny-tile').classList.toggle('hot', state.heat >= 80);

    $('influence').textContent = fmt(state.influence);
    $('influence-title').textContent = influenceTitle();

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
    state.money += weeklyIncome() * weeksElapsed;

    state.weekFrac += weeksElapsed;
    let guard = 0;
    while (state.weekFrac >= 1 && guard < 50){
        state.weekFrac -= 1;
        onWeek();
        guard++;
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
            if (tab.dataset.tab === 'news'){
                state._unread = 0;
                const b = tab.querySelector('.badge'); if (b) b.remove();
            }
        });
    });
    document.querySelectorAll('.speed-btn').forEach(b=>{
        b.addEventListener('click', ()=> setSpeed(parseInt(b.dataset.speed)));
    });
    document.querySelectorAll('.qty-btn').forEach(b=>{
        b.addEventListener('click', ()=> setBuyQty(b.dataset.qty === 'max' ? 'max' : parseInt(b.dataset.qty)));
    });
    $('save-game').addEventListener('click', ()=> saveGame(false));
    $('share-stats').addEventListener('click', shareStats);
    $('reset-game').addEventListener('click', resetGame);
    $('prestige-btn').addEventListener('click', doPrestige);
    $('mute-btn').addEventListener('click', toggleMute);
    $('help-btn').addEventListener('click', modalHelp);
    const objHow = $('obj-how'); if (objHow) objHow.addEventListener('click', modalHelp);
    $('modal-overlay').addEventListener('click', (e)=>{
        if (e.target === $('modal-overlay') && !state.ended) closeModal();
    });
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
    setInterval(()=> saveGame(true), 20000);
    window.addEventListener('beforeunload', ()=> saveGame(true));

    if (!had) setTimeout(modalIntro, 400);
}

init();
