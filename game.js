/* ==========================================================================
   KIWI LANDLORD EMPIRE  —  "PortfolioMax™"
   A satire of Aotearoa's housing crisis.

   The loop:  squeeze tenants -> cash -> buy influence -> suppress scrutiny
              & deregulate -> squeeze harder.  Wealth buys the immunity that
              lets the extraction escalate. That's the joke. It's also the game.

   Everything is data-driven. To add content, add to the tables below.
   ========================================================================== */

'use strict';

/* ------------------------------------------------------------------ CONFIG */
const CFG = {
    START_CASH: 50000,
    DEFAULT_SPEED: 6,          // real seconds per in-game week
    BASE_HEAT_DECAY: 1.2,      // scrutiny lost per week with no help
    HEAT_MAX: 100,
    OFFLINE_CAP_HOURS: 8,
    NEWS_COOLDOWN: 9,          // min real seconds between random headlines
    EVENT_COOLDOWN: 6,         // min real seconds between random events
    SAVE_KEY: 'kiwiLandlordEmpire_v1',
    LEGACY_BONUS: 0.15,        // +15% permanent rent per Restructure
};

/* ---------------------------------------------------------------- PROPERTIES
   The clicker backbone. Cost scales; each unlocks after you own enough. */
const PROPERTIES = [
    { id:'moldyFlat',  emoji:'🍄', name:'Mouldy Studio Flat',        cost:50000,     income:180,   units:1,  mult:1.15, unlock:0,
      desc:'"Cosy character studio." The character is penicillin.' },
    { id:'exState',    emoji:'🏚️', name:'Ex-State House',            cost:240000,    income:640,   units:1,  mult:1.16, unlock:3,
      desc:'Bought cheap off Kāinga Ora, re-let at triple the rent. Public asset, private income.' },
    { id:'leaky',      emoji:'💧', name:"Leaky Building 'Opportunity'", cost:640000,  income:1600,  units:3,  mult:1.18, unlock:7,
      desc:'The body corporate is at war and the cladding is a crime scene. The yield, though.' },
    { id:'sausage',    emoji:'🌭', name:'Subdivided Sausage Flats',  cost:1600000,   income:4200,  units:6,  mult:1.20, unlock:12,
      desc:'Six front doors where a family used to have a lawn. Density! (The good kind, for you.)' },
    { id:'shoebox',    emoji:'📦', name:'CBD Shoebox Apartments',    cost:4000000,   income:9800,  units:12, mult:1.21, unlock:20,
      desc:'12m², no windows, "vibrant inner-city lifestyle." Consented as a car park, honestly.' },
    { id:'block',      emoji:'🏢', name:'Entire Apartment Block',    cost:13000000,  income:31000, units:30, mult:1.23, unlock:30,
      desc:'You are now the whole street. The residents call it "home." You call it "stock."' },
    { id:'retirement', emoji:'👵', name:'Retirement Village',        cost:44000000,  income:98000, units:80, mult:1.25, unlock:45,
      desc:'Deferred management fees: you keep a cut of the resale of a home they never owned. Genius.' },
];

/* ---------------------------------------------------------------- OPERATIONS
   Active "revenue optimisation." Each trades a little Scrutiny for cash.
   money: function(state, m) -> $ gained now. rentBoost: permanent rent × add.  */
const OPERATIONS = [
    { id:'optimiseRent', emoji:'📈', name:'Optimise Rents', heat:7, needTenants:true,
      desc:'A modest, market-aligned adjustment — the market being whatever they\'ll pay before crying.',
      rentBoost:0.025, strain:14,
      news:s => `Rents "optimised" portfolio-wide. Tenants informed the increase reflects "rising costs" — yours, spiritually.` },

    { id:'inventFee', emoji:'🧾', name:'Invent a Fee', heat:4, needTenants:true,
      money:(s,m)=> Math.max(2500, weeklyIncome()*0.7),
      desc:'They already pay to live there. Now they pay to be told they live there.',
      news:s => { const f=pick(FEES); return `New charge introduced: ${f}. Legally grey, morally charcoal, financially excellent.`; } },

    { id:'ignoreHealthy', emoji:'🦠', name:'Ignore Healthy Homes', heat:9, needTenants:true, heatKey:'compliance',
      money:(s,m)=> s.tenants*260 + 3000, strain:6,
      desc:'Why heat the home when you can heat the tenant\'s blood pressure? Insulation is for the weak.',
      news:s => `Healthy Homes deadline quietly ignored. Mould described by landlord as "a natural feature" and "arguably a pet."` },

    { id:'noCause', emoji:'📜', name:'90-Day No-Cause Eviction', heat:14, needTenants:true, heatKey:'tribunal', infl:4,
      money:(s,m)=> Math.max(6000, weeklyIncome()*1.4), evicts:true,
      desc:'No reason required. That\'s not a loophole, that\'s the product.',
      news:s => `Tenant served no-cause termination after requesting a repair. Re-let same day at market. The Minister calls this "supply."` },

    { id:'airbnb', emoji:'🧳', name:'Convert to Airbnb', heat:11, needTenants:true, cost:5000,
      money:(s,m)=> weeklyIncome()*2 + 8000, removesHousehold:true,
      desc:'Housing a tourist for three nights beats housing a nurse for three years. The maths is the maths.',
      news:s => `Long-term rental flipped to short-stay. A family of four replaced by a stag do from Ballarat. Five stars.` },

    { id:'subdivide', emoji:'🚪', name:'Cram & Subdivide', heat:16, needTenants:true, cost:10000,
      rentBoost:0.06, addsUnits:2,
      desc:'Two households, one bathroom, infinite yield. The lounge is now a "third bedroom (flexible)."',
      news:s => `Property subdivided with a curtain and a promise. Council notified via a form nobody will read.` },

    { id:'bondGrab', emoji:'🔒', name:'Bond Grab', heat:5, needTenants:true,
      money:(s,m)=> s.tenants*130 + 1800,
      desc:'Bond withheld for "wear and tear" on a carpet that was already like that in 1997.',
      news:s => `Bond retained for "professional cleaning" that was performed by the next tenant, for free, under duress.` },

    { id:'overseas', emoji:'🌏', name:'Sell to Overseas Investor', heat:6, infl:8, needProperty:2,
      sellTop:2.2,
      desc:'The home sits empty as a "store of value." A whole life, held offshore, as a spreadsheet cell.',
      news:s => `Prime property sold sight-unseen to an offshore buyer. It will remain dark. The land, however, works nights.` },

    // Redemption path — appears only if your hands are relatively clean.
    { id:'sellFHB', emoji:'🕊️', name:'Sell to the Tenants (at cost)', heat:-18, sellTop:1.0, fhb:true,
      needProperty:2, hideIf:s => s.evictions>0 || heatTier().i>=2,
      desc:'Sell a home to the family living in it, for what you paid — forgoing the overseas premium. You lose yield. They lose the fear.',
      news:s => `Landlord sells to sitting tenants at cost. Property forums declare him "unwell." Tenants declare him "the best we ever had," a devastating review of everyone else.` },
];

/* small fee flavour */
const FEES = [
    '"Administrative processing fee" ($45/mo)',
    '"Garden aesthetic levy"',
    '"Communal wheelie-bin access charge"',
    '"Letterbox usage fee"',
    '"After-hours maintenance surcharge" (there is no maintenance)',
    '"Rent payment convenience fee" (for paying rent)',
    '"Sunlight exposure premium" (north-facing)',
];

/* ------------------------------------------------------------------ POLITICS
   Convert cash -> influence, and influence -> less scrutiny / rewritten rules. */
const POLITICS = [
    { id:'donate', emoji:'💰', name:'Donate to a Party', political:true,
      cost:(s)=> 8000 + s.lifetimeInfluence*40, infl:30,
      desc:'Bipartisan generosity. You donate to whoever\'s in power, and to whoever might be. It\'s not corruption, it\'s a hedge.',
      news:s => `${pick(PARTIES)} gratefully accepts your donation, filed under "engaged citizen." A policy you like appears, unrelatedly, on Thursday.` },

    { id:'bribe', emoji:'🤝', name:'Bribe a Councillor', political:true,
      cost:(s)=> 12000 + s.lifetimeInfluence*30, infl:45,
      desc:'A building consent that would take eighteen months arrives overnight, warm from the photocopier.',
      news:s => `Local councillor recuses themselves from nothing. Your resource consent sails through. Democracy: buffering.` },

    { id:'suppress', emoji:'🗞️', name:'Spike the Story', political:true, need:{infl:80},
      cost:(s)=> 15000, spendInfl:80, heat:-32,
      desc:'That RNZ reporter had it all — the mould, the emails, the crying. Now they have a new "opportunity" in Gore.',
      news:s => `Investigation into your empire "paused pending resourcing." The reporter is reassigned to the weather. It is fine tomorrow.` },

    { id:'prBlitz', emoji:'🕴️', name:'Reputation Laundering Blitz', political:true, need:{infl:40},
      cost:(s)=> 9000, spendInfl:40, heat:-18,
      desc:'A warm profile drops: "Meet the everyday Kiwi battler who happens to own 40 homes." You\'re humbled, apparently.',
      news:s => `Sympathetic op-ed reframes you as a "housing provider under pressure." The pressure is other people\'s rent. It works.` },

    { id:'weakenLaw', emoji:'⚖️', name:'Lobby to Weaken Tenancy Law', political:true, need:{infl:150, phase:2},
      cost:(s)=> 60000, spendInfl:150, permHeatDown:0.85, once:true,
      desc:'Why break the rules when you can commission new ones? No-cause returns. Notice periods shrink. Everyone\'s a stakeholder.',
      news:s => `Select committee hears from "the sector" (you). Tenant groups hear about it afterwards. The law gets shorter and so do the notice periods.` },

    { id:'textMinister', emoji:'📱', name:'Text a Minister Directly', political:true, need:{infl:280},
      cost:(s)=> 90000, spendInfl:200, infl:260,
      desc:'No official channel, no paper trail, just a mate\'s number and a casual "you around?" It worked for Sir Bill.',
      news:s => `A cabinet-level problem resolved by text message in the manner of a 2024 board appointment nobody was allowed to ask about.` },

    { id:'board', emoji:'🏛️', name:'Get Appointed to the Housing Board', political:true, need:{infl:520, phase:4},
      cost:(s)=> 500000, spendInfl:500, ending:'minister',
      desc:'The regulator needs a "commercial perspective." You are the commercial perspective the regulator needs regulating for.',
      news:s => `You are appointed to oversee the very system you plunder. The fox is handed the henhouse keys and a governance stipend.` },
];

const PARTIES = ['National','Labour','ACT','NZ First','the incoming government (whoever that is)'];

/* ------------------------------------------------------------------ SERVICES
   Permanent upgrades. Bought once, working forever. The real progression. */
const SERVICES = [
    { id:'propManager', emoji:'👔', name:'Property Manager', cost:40000,
      desc:'They handle the tenants so you never have to see one. +25% rent income; they also invent fees on your behalf.',
      tag:'+25% rent' },

    { id:'rentAlgo', emoji:'🤖', name:'Rent-Setting Algorithm', cost:280000, need:{phase:1},
      desc:'The algorithm sets every rent to the max the data allows. Nobody decided. Nobody\'s responsible. +40% rent.',
      tag:'+40% rent' },

    { id:'compliance', emoji:'📋', name:'Healthy Homes "Compliance" Consultant', cost:120000,
      desc:'Certifies your compliance with the standards you are actively ignoring. Halves the scrutiny from ignoring them.',
      tag:'Ignore-standards heat ×0.5' },

    { id:'methKit', emoji:'🧪', name:'Meth-Test Grift Kit', cost:90000,
      desc:'Charge every tenant for a meth test that reads positive on a bacon sandwich. Passive income, per household, forever.',
      tag:'+$14/household/wk' },

    { id:'accomSupp', emoji:'🏦', name:'Accommodation Supplement Harvester', cost:320000, need:{phase:1},
      desc:'The government tops up the rent you set — so you set it higher. The subsidy lands in your account. Thanks, taxpayer.',
      tag:'+$22/household/wk' },

    { id:'tribunal', emoji:'📚', name:'Tenancy Tribunal Season Pass', cost:200000,
      desc:'Frequent-flyer status at the Tribunal. They know your name. Halves eviction scrutiny; you basically never lose.',
      tag:'Eviction heat ×0.5' },

    { id:'astroturf', emoji:'📣', name:'Astroturf Renters\' Group', cost:400000, need:{phase:2},
      desc:'A "grassroots" tenant-advocacy group. The grass is plastic and the roots are yours. All scrutiny generated ×0.75.',
      tag:'All heat ×0.75' },

    { id:'prFirm', emoji:'📰', name:'PR Crisis Firm on Retainer', cost:550000, need:{phase:2},
      desc:'On call to reframe "slumlord" as "housing provider." Scrutiny cools far faster — the news cycle is only three days long.',
      tag:'Scrutiny decays fast' },

    { id:'lobbyist', emoji:'📞', name:'Lobbyist on Speed-Dial', cost:800000, need:{phase:3},
      desc:'Your problems become their policy. Every optimisation you perform now also earns political influence.',
      tag:'Operations grant influence' },

    { id:'trust', emoji:'🏛️', name:'Family Trust Restructure', cost:1200000, need:{phase:3},
      desc:'Nothing is technically yours anymore — which is why nothing is technically your fault. Unlocks Restructuring.',
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
    { min:180,  name:'Council Whisperer' },
    { min:400,  name:'Party Donor (Bronze)' },
    { min:800,  name:'Property Lobby' },
    { min:1500, name:'Shadow Cabinet' },
    { min:3000, name:'Kingmaker' },
];

/* ------------------------------------------------------------ SCRUTINY TIERS */
const HEAT_TIERS = [
    { min:0,  key:'calm',    trend:"Nobody's watching",  foot:'The press has bigger fish to fry.' },
    { min:25, key:'noticed', trend:'A few noticing',      foot:'A Reddit thread. A pointed tweet. Nothing you can\'t outspend.' },
    { min:50, key:'heat',    trend:'Getting warm',        foot:'Journalists are emailing. Inspectors are curious. Tidy up or pay up.' },
    { min:78, key:'crisis',  trend:'🔥 Full exposé risk', foot:'You are a headline waiting to happen. Buy silence — fast.' },
];

/* ------------------------------------------------------------- TENANT PIECES */
const T_FIRST = ['Aroha','Wiremu','Mereana','Josh','Kirsty','Tama','Ana','Dylan','Sina','Manaia','Charlotte','Rangi','Priya','Beau','Hine','Cody','Fetu','Grace','Nikau','Chloe','Ropata','Sam','Moana','Kane'];
const T_LAST  = ['Ngata','Williams','Patel','Tuilagi','Thompson','Rewiti','Chen','O\'Brien','Faleolo','Harris','Whitcombe','Kaur','Mafi','Baker','Wallace','Hohepa','Singh','Katoa','Reid','Marsh'];
const T_JOB = [
    'ED nurse, night shifts','Primary school teacher','Supermarket 2IC','Barista + Uber, both',
    'Aged-care worker','Apprentice sparky','Bus driver','Solo mum, two kids','Uni student x3 (a "flat")',
    'Warehouse picker','Chef, 55-hr weeks','Palliative care nurse','Call-centre team','Retail, zero-hours',
    'Council parks crew','Beneficiary + part-time','Truckie, long-haul','Kōhanga reo kaiako',
];
const T_SITUATION = [
    'Paying $__ for a sleepout with a curtain for a wall.',
    'Rent is 61% of their take-home. The other 39% is anxiety.',
    'Been on the KO waitlist for 3 years. Number: still four digits.',
    'Heat pump broke in June. You replied in spring: "have you tried blankets?"',
    'Third flat in two years. Every landlord "needed it for family."',
    'Kids share a room with the hot-water cylinder. Cosy!',
    'Chose between the power bill and the dentist. Chose neither.',
    'Applied against 48 others for this damp one-bed. "Won" it.',
    'Saving for a deposit since 2016. The deposit moved.',
    'Was told the mould is "just condensation" for the fourth time.',
    'Commutes 90 mins because the city priced them to the edge of it.',
    'Wrote you a lovely email about the leak. You screenshotted it to your accountant.',
];

/* ------------------------------------------------------------------- HEADLINES
   Deadpan by default. The gap between the tone and the content is the joke. */
const HEADLINES = [
    'Landlord raises rent $90/week citing "market conditions." The condition is that he wants more money.',
    'First-home buyer outbid by a LinkedIn post about resilience.',
    'Property seminar sells out: "Maximise Returns, Minimise Contact With Consequences."',
    '"Cosy character home" viewing draws 51 applicants. Character revealed to be black mould shaped like a frown.',
    'Minister announces bold plan to fix housing by saying the word "supply" 40 times.',
    'Median house price now 11× median income. Economists label this "a soft landing."',
    'Investor buys 30th home, tells reporter "anyone can do this" from a home anyone cannot buy.',
    'Tenant asks for a repair. Receives, instead, personal growth.',
    'Emergency housing waitlist hits record high. Government congratulates itself on the accuracy of the count.',
    'Landlord charges pet bond for a goldfish. Goldfish named as guarantor.',
    'Renter "lucky" to secure damp flat at $680/week, according to the person charging $680/week.',
    '"Mum and dad investors" turn out to be a hedge fund named after someone\'s mum and dad.',
    'Healthy Homes compliance deadline passes. 40% of rentals respond by not.',
    'Sausage flat advertised as "vibrant community." Community is one shared meter box, quietly warring.',
    'Overseas buyer purchases entire development "to help supply." Development remains, helpfully, empty.',
    'Bright-line test shortened. Property investors describe the change as "closure."',
    'Tenant falls through rotted floor. Landlord bills them for the hole.',
    'Council red-tags unsafe rental. It is re-listed next week under a new address and a brave new lie.',
    'Renters union forms. Landlords form a union to be sad about it on the radio.',
    'Accommodation supplement rises. Rents rise by the supplement, plus a tip, by Friday.',
    'MP who owns seven rentals votes against rent controls, citing "the little guy," meaning himself.',
    'Airbnb host wins "community award" from a community that can no longer afford to live there.',
    'Rent increase blamed on interest rates. Mortgage paid off in 2014. The interest is emotional.',
    'Tenant scores 98/100 on application. Loses to a cash buyer who scored a vibe.',
    'New build "affordable" at $1.1m. Affordable to whom remains classified.',
    '"We provide a valuable service," says man extracting the value and providing the bill.',
    'Study finds renting bad for health. Landlords cite study as reason to raise rent (stress premium).',
    'Family relocates from Auckland to Australia. Auckland lists their old room for $360/week, per person.',
];

/* --------------------------------------------------------------------- STATE */
let state;

function defaultState() {
    const props = {};
    PROPERTIES.forEach(p => props[p.id] = { count: 0, cost: p.cost });
    return {
        v: 1,
        money: CFG.START_CASH,
        heat: 0,
        influence: 0,
        lifetimeInfluence: 0,
        rentMultBonus: 0,      // additive permanent bonus from optimise/subdivide
        extraUnits: 0,         // extra households from subdivide
        legacy: 0,             // prestige tiers
        permHeatMult: 1,       // from weakenLaw
        properties: props,
        upgrades: {},          // serviceId -> true
        onceUsed: {},          // one-shot political actions
        tenants: 0,
        featured: [],          // named tenant objects
        speed: CFG.DEFAULT_SPEED,
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
        heatDecay: CFG.BASE_HEAT_DECAY + (u.prFirm ? 4 : 0) + (u.astroturf ? 0.6 : 0),
        passivePerTenant: (u.methKit ? 14 : 0) + (u.accomSupp ? 22 : 0),
        inflPerOp: u.lobbyist ? 3 : 0,
    };
}

function baseTenants(){
    let n = state.extraUnits;
    PROPERTIES.forEach(p => n += state.properties[p.id].count * p.units);
    return n;
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
        // resale value ~ what you'd sell for (current listed cost / mult, per unit already bought)
        const base = PROPERTIES.find(x=>x.id===p.id).cost;
        w += state.properties[p.id].count * base * 1.1;
    });
    return w;
}

function phase(){
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

function sellTopValue(){
    let best = 0, id = null;
    PROPERTIES.forEach(p=>{
        if (state.properties[p.id].count > 0 && p.cost > best){ best = p.cost; id = p.id; }
    });
    return id ? PROPERTIES.find(p=>p.id===id).cost * 1.1 : 0;
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
    if (!raw){
        // migrate from very old key
        raw = localStorage.getItem('kiwiLandlordEmpire');
    }
    if (!raw){ state = defaultState(); return false; }
    try {
        const loaded = JSON.parse(raw);
        state = Object.assign(defaultState(), loaded);
        // heal any missing property entries
        PROPERTIES.forEach(p => { if (!state.properties[p.id]) state.properties[p.id] = { count:0, cost:p.cost }; });
        state.upgrades = state.upgrades || {};
        state.onceUsed = state.onceUsed || {};
        state.featured = state.featured || [];
        if (state.money < 1000 && propertyCount() === 0) state.money = CFG.START_CASH; // rescue dead saves
        return true;
    } catch(e){ state = defaultState(); return false; }
}

function offlineProgress(){
    const elapsed = (now() - (state.lastUpdate || now())) / 1000; // seconds
    if (elapsed < 30) return;
    const capped = Math.min(elapsed, CFG.OFFLINE_CAP_HOURS * 3600);
    const weeks = capped / CFG.DEFAULT_SPEED;
    const earned = weeklyIncome() * weeks;
    if (earned > 1){
        state.money += earned;
        // scrutiny cools while you're away
        state.heat = clamp(state.heat - multipliers().heatDecay * weeks, 0, CFG.HEAT_MAX);
        const hrs = (capped/3600);
        setTimeout(()=> modalOffline(earned, hrs), 400);
    }
}

/* =============================================================== RENDERING */
const updaters = [];   // per-item refresh closures

function buildAll(){
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
                <span>Price <b data-price></b></span>
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
            card.querySelector('[data-price]').textContent = money(st.cost);
            const lock = card.querySelector('[data-lock]');
            if (!unlocked){
                lock.hidden = false;
                lock.textContent = `🔒 Unlocks at ${p.unlock} properties owned`;
                btn.disabled = true;
                btn.textContent = 'Locked';
            } else {
                lock.hidden = true;
                btn.disabled = state.money < st.cost;
                btn.textContent = state.money < st.cost ? 'Not enough cash' : 'Acquire';
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
            const tags = btn.querySelector('[data-tags]');
            tags.innerHTML = opTags(op);
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
            <button class="buy-btn" data-buy>Purchase — <span data-price></span></button>`;
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
                btn.innerHTML = 'Locked';
            } else {
                card.classList.remove('locked');
                lock.hidden = true;
                btn.className = 'buy-btn';
                btn.disabled = state.money < sv.cost;
                btn.innerHTML = `Purchase — ${money(sv.cost)}`;
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
            btn.querySelector('[data-tags]').innerHTML = tags.join('');
            const gate = meetsNeed(pa.need);
            const afford = state.money >= cost && (!pa.spendInfl || state.influence >= pa.spendInfl);
            btn.disabled = !gate.ok || !afford;
            if (!gate.ok){
                btn.querySelector('[data-tags]').innerHTML += `<span class="tag lock">🔒 ${gate.why}</span>`;
            }
        });
    });
}

function meetsNeed(need){
    if (!need) return { ok:true };
    if (need.phase && phase().i < need.phase)
        return { ok:false, why:`Requires ${PHASES[need.phase].name}` };
    if (need.infl && state.influence < need.infl)
        return { ok:false, why:`Requires ${need.infl} influence on hand` };
    return { ok:true };
}

/* ---- Tenants ---- */
function makeTenant(){
    const first = pick(T_FIRST), last = pick(T_LAST);
    const rent = 420 + Math.floor(Math.random()*10)*35;
    let sit = pick(T_SITUATION).replace('$__', '$'+rent);
    return { name:`${first} ${last}`, job:pick(T_JOB), rent, strain: 20 + Math.floor(Math.random()*30), situation: sit, emoji: pick(['🧑','👩','👨','🧑‍🦱','👵','👨‍🦰','🧕','👩‍🦰']) };
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
    const wrap = $('tenant-cards');
    const cards = wrap.querySelectorAll('.tenant-card');
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
    if (state.money < st.cost) return;
    state.money -= st.cost;
    st.count++;
    st.cost = Math.floor(st.cost * p.mult);
    fx('−'+money(p.cost), 'neg', e);
    blip(180);
    addNews(`You acquired another ${p.name.toLowerCase()}. Somewhere, a first-home buyer refreshes TradeMe and quietly gives up.`, 'bad');
    if (syncTenants()) renderTenants();
    refresh();
}

function doOperation(op, e){
    if (!opAvailable(op)) return;
    const m = multipliers();
    if (op.cost) state.money -= op.cost;

    // money
    if (op.money){
        const v = op.money(state, m);
        state.money += v;
        fx((v<0?'−':'+')+money(Math.abs(v)), v<0?'neg':'pos', e);
    } else if (op.cost){
        fx('−'+money(op.cost), 'neg', e);
    }

    // permanent rent boost
    if (op.rentBoost){ state.rentMultBonus += op.rentBoost; state.rentRaises++; }
    if (op.addsUnits){ state.extraUnits += op.addsUnits; }

    // heat (with per-op reduction upgrades)
    let heat = op.heat || 0;
    if (op.heatKey === 'compliance' && state.upgrades.compliance) heat *= 0.5;
    if (op.heatKey === 'tribunal' && state.upgrades.tribunal) heat *= 0.5;
    heat *= (state.upgrades.astroturf ? 0.75 : 1) * state.permHeatMult;
    addHeat(heat, e);

    // influence (Bishop-approved evictions, lobbyist passive)
    let infl = (op.infl || 0) + m.inflPerOp;
    if (infl){ addInfluence(infl, e); }

    // special outcomes
    if (op.id === 'ignoreHealthy') state.violations++;
    if (op.id === 'inventFee') state.feesInvented++;
    if (op.evicts){ state.evictions++; evictSomeone(); }
    if (op.removesHousehold){ state.extraUnits = Math.max(state.extraUnits-1, -baseTenantsFromProps()+1); }
    if (op.sellTop){ sellTopProperty(op.sellTop); }
    if (op.fhb){ state.fhbSales++; checkRedemption(); }

    // strain nearby tenants
    if (op.strain) state.featured.forEach(t=> t.strain = clamp(t.strain + op.strain, 0, 100));

    if (op.news) addNews(op.news(state), op.heat < 0 ? 'good' : 'bad');
    blip(op.heat < 0 ? 320 : 200);
    if (syncTenants()) renderTenants();
    refresh();
}

function baseTenantsFromProps(){
    let n = 0; PROPERTIES.forEach(p => n += state.properties[p.id].count * p.units); return n;
}

function sellTopProperty(mult, atCost){
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
    if (card){ card.classList.add('breaking'); }
    addNews(`${t.name} (${t.job}) — evicted. Boxes on the verge, kids in the car, a new listing already live at +18%.`, 'bad');
    state.featured[idx] = makeTenant();
    setTimeout(renderTenants, 260);
}

function squeezeTenant(idx, e){
    const t = state.featured[idx]; if (!t) return;
    const bump = 25 + Math.floor(Math.random()*30);
    t.rent += bump; t.strain = clamp(t.strain + 18 + Math.floor(Math.random()*14), 0, 100);
    state.money += bump * 4; // a month's extra, banked as "arrears buffer"
    state.rentRaises++;
    fx('+'+money(bump*4), 'pos', e);
    addHeat(3, e);
    blip(220);

    if (t.strain >= 100){
        // they break: mostly evicted, sometimes they scrape by
        if (Math.random() < 0.25){
            addNews(`${t.name} somehow made rent — took a third job and stopped answering the door. You call this "resilience."`, 'bad');
            t.strain = 82;
            renderTenants();
        } else {
            state.evictions++;
            state.money += Math.max(4000, weeklyIncome()*0.8);
            addHeat(10, e);
            const card = $('tenant-cards').children[idx];
            if (card) card.classList.add('breaking');
            addNews(`${t.name} couldn't keep up. Evicted, re-let same week at market. The Minister files this under "supply."`, 'bad');
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
    if (e) fx('+'+Math.round(delta)+' infl', 'infl', e, 20);
}

/* =============================================================== EVENTS */
function onWeek(){
    const m = multipliers();
    // scrutiny cools
    state.heat = clamp(state.heat - m.heatDecay, 0, CFG.HEAT_MAX);

    // tenants drift toward strain slowly as rents outrun wages
    state.featured.forEach(t=>{ t.strain = clamp(t.strain + (Math.random()<0.5?0.4:0), 0, 100); });

    // random headline
    const nowS = now()/1000;
    if (nowS - (state._lastNews||0) > CFG.NEWS_COOLDOWN && Math.random() < 0.35){
        addNews(pick(HEADLINES));
        state._lastNews = nowS;
    }

    // random event, probability scales with scrutiny
    const eventProb = 0.04 + (state.heat/100) * 0.4;
    if (nowS - (state._lastEvent||0) > CFG.EVENT_COOLDOWN && Math.random() < eventProb){
        rollEvent();
        state._lastEvent = nowS;
    }

    // exposé ending pressure: sustained max heat + low influence
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
    const ev = pick(pool);
    ev.run();
    refresh();
}

const EVENTS = [
    /* ---- calm / positive (tier 0) ---- */
    { tier:0, cond:()=> state.tenants>0, run(){
        const b = Math.floor(weeklyIncome()*0.6);
        state.money += b;
        addNews(`✅ Migration surge. Demand spikes, you raise the ask overnight. +${money(b)}. "It's just supply and demand," you say, adjusting the demand.`, 'good');
    }},
    { tier:0, run(){
        addNews(`A think-tank you fund releases a report proving the housing crisis is caused by tenants wanting houses.`, 'event');
    }},

    /* ---- noticed (tier 1) ---- */
    { tier:1, run(){
        addNews(`⚠️ A Reddit thread about your "letterbox usage fee" hits 4k upvotes. Your PR person suggests you "log off." You do not log off.`, 'event');
        addHeat(3);
    }},
    { tier:1, cond:()=> state.violations>0, run(){
        if (state.upgrades.compliance || state.influence>=100){
            addNews(`⚠️ Healthy Homes inspector arrives. Your "Compliance Consultant" hands them a folder. They leave, subtly worse people.`, 'event');
        } else {
            const fine = state.tenants*900 + 5000;
            state.money -= fine;
            addHeat(6);
            addNews(`⚠️ Healthy Homes inspection FAILED. Fined ${money(fine)}. Should've bought the consultant, not the boat.`, 'bad');
        }
    }},
    { tier:1, run(){
        const c = propertyCount()*700 + 2000;
        state.money -= c;
        addNews(`⚠️ Interest rates tick up. Mortgage servicing +${money(c)}/wk. You forward the cost to tenants and the blame to the RBNZ.`, 'bad');
    }},

    /* ---- heat (tier 2) ---- */
    { tier:2, cond:()=> state.rentRaises>3, run(){
        addHeat(8);
        addNews(`🔥 Your tenants formed a renters' union. They've made a spreadsheet. It has tabs. One tab is your home address.`, 'bad');
    }},
    { tier:2, cond:()=> state.evictions>0, run(){
        if (state.upgrades.tribunal){
            addNews(`⚖️ Tenancy Tribunal case. Your Season Pass kicks in — you win on a technicality involving a comma. Costs awarded to the crying party.`, 'event');
        } else {
            const pay = 4000 + state.tenants*200;
            state.money -= pay; addHeat(4);
            addNews(`⚖️ Tenancy Tribunal orders you to repay ${money(pay)} in unlawful fees. You appeal on principle (of keeping the money).`, 'bad');
        }
    }},
    { tier:2, run(){
        addHeat(6);
        addNews(`🔥 A journalist emails: "comment on the mould, the fees, and the child with asthma?" You reply "no further comment" and three lawyers.`, 'bad');
    }},

    /* ---- crisis (tier 3) ---- */
    { tier:3, run(){
        if (state.influence >= 150){
            state.influence -= 60;
            addNews(`🛡️ An exposé loads — then a minister calls you "a valued housing provider" on Morning Report and the story dies mid-sentence. −60 influence, well spent.`, 'event');
        } else {
            state.heat = clamp(state.heat+6,0,100);
            state.influence = Math.max(0, state.influence-40);
            addNews(`💥 RNZ EXPOSÉ: "Inside the Mould Empire." Your face, a tenant's tears, your boat. The public is, briefly, furious.`, 'bad');
        }
    }},
    { tier:3, cond:()=> state.tenants>=6, run(){
        const loss = Math.floor(weeklyIncome()*3);
        state.money -= loss; addHeat(5);
        addNews(`✊ RENT STRIKE. Your tenants collectively withhold. −${money(loss)} while they hold the line and you hold your breath.`, 'bad');
    }},
    { tier:3, run(){
        addHeat(4);
        addNews(`📣 Protesters outside your Remuera villa with a banner reading "HOUSES ARE FOR LIVING IN." You draw the curtains (imported, blockout).`, 'bad');
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
            body:`<p>You did it. You've been appointed to oversee the housing system you spent the whole game strip-mining — by text message, no Cabinet, no questions, in the grand tradition of a certain 2024 board appointment.</p>
                  <p>A slumlord with <b>${state.evictions} evictions</b> and <b>${state.violations} ignored standards</b> is now in charge of fixing the crisis. You appear on the news to say the solution is "supply" and "getting government out of the way." Reporters nod. Somewhere, a nurse reads it in the car she lives in.</p>
                  <p>The irony is so dense you could subdivide it.</p>` },
        empire: { kicker:'Ending — Total Victory', title:'The Empire 🏢',
            body:`<p>A quarter of a billion dollars. You own so much of Aotearoa that "landlord" undersells it — you're a weather system.</p>
                  <p>First-home buyers gave up a generation ago. Renting is simply the condition of being alive here now, and you are the condition. You won capitalism. The prize is that everyone else lost, and pays you monthly for the privilege.</p>` },
        expose: { kicker:'Ending — The Reckoning', title:'The Exposé 💥',
            body:`<p>You couldn't buy the silence fast enough. RNZ, Stuff, and The Spinoff dropped it on the same morning: the mould, the fees, the child with asthma, the boat named "Yield."</p>
                  <p>With <b>${state.evictions} evictions</b> and <b>${state.violations} ignored standards</b> on the record and not enough influence to make it vanish, the Tribunal moved, the banks blinked, and the portfolio came apart. Turns out the immunity was rented too. You missed a payment.</p>` },
        collapse: { kicker:'Ending — Margin Call', title:'The Market Correction 📉',
            body:`<p>You over-leveraged into the sky and the sky sent a bill. Rates rose, migration turned, the empty "stores of value" stayed empty, and the interest — for once — was entirely yours.</p>
                  <p>You declared bankruptcy owing <b>${money(-state.money)}</b>. Every eviction, every bribe, every fee — and the maths still found you. The homes get sold to another you. The tenants don't even get to change the locks.</p>` },
        reform: { kicker:'Ending — The Secret One', title:'The Reformed Landlord 🕊️',
            body:`<p>You sold the homes to the families living in them, at cost, and never evicted a soul. Property forums call you "compromised." Tenants call you the best landlord they ever had — a devastating indictment of the other ones.</p>
                  <p>Here's the twist the game owes you: it barely moved the market. A few families housed; the crisis didn't notice. Individual virtue is lovely and it is not policy. The system that made you rich is still there, waiting for someone less kind to buy back in.</p>
                  <p>You did a good thing anyway. That has to count for something, even if the spreadsheet says it doesn't.</p>` },
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
            state = defaultState();
            state.upgrades = keepUpgrades;
            state.legacy = keepLegacy;
            state.influence = keepInfl;
            state.lifetimeInfluence = keepLifetime;
            state.muted = muted;
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

    // ping the News tab if not active
    const newsTab = document.querySelector('.tab[data-tab="news"]');
    if (!newsTab.classList.contains('active')){
        state._unread = (state._unread||0) + 1;
        let b = newsTab.querySelector('.badge');
        if (!b){ b = document.createElement('span'); b.className='badge'; newsTab.appendChild(b); }
        b.textContent = state._unread;
    }
}

function renderNews(first){
    if (first){ $('news-feed').innerHTML = ''; addNews('Welcome to PortfolioMax™. Wealth-building starts now. Someone has to own the houses — why not you, specifically?', 'event'); }
}

/* =============================================================== JUICE */
function fx(text, cls, e, offsetY){
    if (!e || !e.currentTarget && !e.clientX) return;
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

/* tiny WebAudio blip — no assets, respects mute */
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

function modalHelp(){
    showModal(`
        <div class="modal-kicker">How to build an empire</div>
        <h1>The loop 🔁</h1>
        <p><b>1. Acquire property.</b> Passive rent is your base. Each property removes a home from the market — that's not a bug.</p>
        <p><b>2. Optimise (Operations).</b> Squeeze tenants for cash. Every squeeze raises <span style="color:#b25a15;font-weight:700">Scrutiny</span> — the public heat meter up top.</p>
        <p><b>3. Buy Influence (Politics).</b> Turn cash into political capital. Then spend it to <b>Spike the Story</b> and cool your scrutiny before it boils over.</p>
        <p><b>4. Retain Services.</b> Permanent upgrades that let you squeeze harder for less heat. This is where empires are really built.</p>
        <p>Let Scrutiny redline with no influence and the <b>exposé</b> ends you. Play it clean and there's a secret ending — good luck finding the appetite for it.</p>
    `, [{ label:'Let\'s ruin some lives', cls:'primary', fn:()=> closeModal() }]);
}

/* =============================================================== SHARE */
function shareStats(){
    const txt = `🏠 KIWI LANDLORD EMPIRE

I became: ${phase().name}
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

/* =============================================================== SPEED / MUTE */
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
function toggleMute(){
    state.muted = !state.muted;
    $('mute-btn').textContent = state.muted ? '🔇' : '🔊';
}

/* =============================================================== REFRESH */
function refresh(){
    // stat tiles
    $('money').textContent = money(state.money);
    $('income-rate').textContent = '+' + money(weeklyIncome()) + '/wk';
    $('networth').textContent = 'Net worth: ' + money(netWorth());

    const ph = phase();
    $('phase-name').textContent = ph.name;

    // scrutiny
    const tier = heatTier();
    $('scrutiny-fill').style.width = state.heat + '%';
    $('scrutiny-tier').textContent = tier.trend;
    $('scrutiny-foot').textContent = tier.foot;
    document.querySelector('.scrutiny-tile').classList.toggle('hot', state.heat >= 78);

    // influence
    $('influence').textContent = fmt(state.influence);
    $('influence-title').textContent = influenceTitle();

    // run all item updaters
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
    if (dt > 1) dt = 1; // guard against tab-throttle jumps

    const weeksElapsed = dt / state.speed;

    // continuous income
    state.money += weeklyIncome() * weeksElapsed;

    // process discrete weeks
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
    // tabs
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
    // speed
    document.querySelectorAll('.speed-btn').forEach(b=>{
        b.addEventListener('click', ()=> setSpeed(parseInt(b.dataset.speed)));
    });
    // footer
    $('save-game').addEventListener('click', ()=> saveGame(false));
    $('share-stats').addEventListener('click', shareStats);
    $('reset-game').addEventListener('click', resetGame);
    $('prestige-btn').addEventListener('click', doPrestige);
    $('mute-btn').addEventListener('click', toggleMute);
    $('help-btn').addEventListener('click', modalHelp);
    // close modal on overlay click (non-ending only)
    $('modal-overlay').addEventListener('click', (e)=>{
        if (e.target === $('modal-overlay') && !state.ended) closeModal();
    });
}

function init(){
    const had = loadGame();
    syncTenants();
    if (had) offlineProgress();
    buildAll();
    setupEvents();
    setSpeedButtons();
    $('mute-btn').textContent = state.muted ? '🔇' : '🔊';
    refresh();

    setInterval(tick, 100);
    setInterval(()=> saveGame(true), 20000);
    window.addEventListener('beforeunload', ()=> saveGame(true));

    if (!had) setTimeout(modalHelp, 600);
}

init();
