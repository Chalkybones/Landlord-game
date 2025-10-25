// Kiwi Landlord Empire - Game Logic
// A biting satire of NZ's housing crisis

// Game State
const gameState = {
    money: 0, // Start with 0 cash after buying initial properties
    moral: 100, // 0-100, lower is more evil
    political: 0, // 0-1000+, higher unlocks more corruption

    properties: {
        moldyFlat: { count: 3, cost: 66125, income: 150, costMultiplier: 1.15 }, // Start with 3 properties
        shitbox: { count: 0, cost: 200000, income: 500, costMultiplier: 1.18 },
        leaky: { count: 0, cost: 500000, income: 1200, costMultiplier: 1.20 },
        luxury: { count: 0, cost: 1200000, income: 2500, costMultiplier: 1.22 },
        block: { count: 0, cost: 5000000, income: 8000, costMultiplier: 1.25 }
    },

    tenants: 0,
    exploitedThisWeek: 0,

    speed: 10, // seconds per week
    lastUpdate: Date.now(),
    lastRentCollect: 0, // For manual rent collection cooldown

    newsHistory: [],
    actionsPerformed: {
        rentRaises: 0,
        evictions: 0,
        violations: 0,
        bribes: 0
    },

    // Cooldown tracking for repeatable actions
    cooldowns: {
        collectRent: 0,
        raiseRents: 0,
        bullshitFees: 0,
        petBond: 0
    }
};

// Moral Compass Levels
const moralLevels = [
    { threshold: 80, name: "Questionably Kiwi" },
    { threshold: 60, name: "Ethically Challenged" },
    { threshold: 40, name: "Certified Bastard" },
    { threshold: 20, name: "Slumlord Supreme" },
    { threshold: 0, name: "Absolute Scum" }
];

// Political Power Levels
const politicalLevels = [
    { threshold: 0, name: "Civilian Scumbag" },
    { threshold: 50, name: "Local Nuisance" },
    { threshold: 150, name: "Council Pest" },
    { threshold: 300, name: "Bishop's Mate" },
    { threshold: 500, name: "Property Lobby" },
    { threshold: 800, name: "Shadow Minister" },
    { threshold: 1200, name: "Chris Bishop 2.0" }
];

// News Headlines Pool - Fictional but realistic NZ housing headlines
const newsHeadlines = [
    "Auckland landlord raises rent $80/week, claims 'market adjustment' despite property sitting vacant.",
    "Wellington tenant forced to choose between heating and groceries as cost of living soars.",
    "Property investor seminar in Christchurch sells out - 'Maximising Returns While Minimising Maintenance' theme.",
    "First home buyer outbid by cash investor for third time this month, gives up house hunting.",
    "Rental listing advertises 'cosy character home' - inspection reveals black mould and broken windows.",
    "Local family of four priced out of Auckland, relocates to Palmerston North.",
    "Housing Minister announces new policy to 'flood market with supply' - rents continue climbing.",
    "Tenant reports broken heat pump in July, landlord responds in November with 'have you tried blankets?'",
    "Property management company introduces $45 'inspection fee' charged monthly to tenants.",
    "Council red-tags unsafe rental - landlord re-lists same property next week under different address.",
    "Student flat sleeps 9 in converted garage, landlord calls it 'boutique co-living experience'.",
    "Rental application requires references, credit check, blood type, and firstborn child.",
    "Median house price now 12x median income - economists say 'this is fine'.",
    "Tenant asks landlord to fix leaking roof - served 90-day termination notice next week.",
    "Property investor boasts '15% yield' by converting lounge into two extra bedrooms.",
    "Emergency housing waitlist grows by 200 families this quarter - government celebrates policy success.",
    "Auckland rental viewing attracts 47 applicants for damp one-bedroom flat advertised at $650/week.",
    "Landlord installs coin-operated shower in rental, claims it 'encourages water conservation'.",
    "Local MP who owns 7 investment properties votes against rent control measures.",
    "Tenant discovers landlord hasn't paid rates in 3 years, still charged 'council rates levy'.",
    "Property seminar teaches landlords how to legally avoid insulation requirements.",
    "Christchurch rental fails fourth consecutive inspection - remains occupied, rent increased.",
    "Young couple lives in garage paying $400/week - 'just saving for deposit' they say optimistically.",
    "Landlord association spokesperson: 'We're providing a valuable service to the community'.",
    "Rental application rejected - tenant scored 98/100 but investor with cash offer scored 101.",
    "Government announces $10m housing initiative - average Auckland home costs $1.2m.",
    "Tenant charged $800 bond deduction for 'general wear and tear to carpet' after 4-year tenancy.",
    "Property investor podcast hits #1: 'Retire Rich - Your Tenants Will Pay Your Mortgage'.",
    "Wellington flat advertised as '2-bedroom' revealed to be converted sleepout with curtain divider.",
    "Landlord insists on showing house while tenants eat dinner - 'but I gave 48 hours notice'.",
    "Healthy Homes compliance deadline passes - 40% of rentals still non-compliant.",
    "First-time buyer discovers home they're purchasing already has tenants paying landlord's mortgage.",
    "Local tenant advocacy group receives 847 complaints this month - up from 634 last month.",
    "Property investor buys 50th rental - interview headline: 'I'm just helping solve housing crisis'.",
    "Rental listing photos show immaculate home - actual property has peeling wallpaper and broken oven.",
    "Landlord increases rent citing 'interest rates' - mortgage paid off 8 years ago.",
    "Student discovers flatmate is actually landlord's cousin 'monitoring property condition'.",
    "Auckland couple's combined income $180k - still can't afford deposit after 6 years saving.",
    "Tenant's bond held for 6 months while landlord 'considers damages' - Tribunal backlog cited.",
    "Property manager takes 2 weeks to reply to maintenance request, takes 2 hours to issue rent reminder.",
    "Overseas investor purchases entire new development - 'will help housing supply' says spokesperson.",
    "Rental ad promises 'sunny north-facing bedroom' - inspection reveals room is south-facing cupboard.",
    "Landlord charges tenant for professional carpet clean - cleaner confirms it wasn't actually cleaned.",
    "Property inspection finds rotting floor joists - landlord blames tenant for 'excessive walking'.",
    "Real estate investor celebrates buying 10th property this year - 'anyone can do it' he insists.",
    "Wellington tenant lives in flat with gaps in walls - 'good airflow' says landlord.",
    "Housing conference panel of 8 landlords discusses 'tenant entitlement problem'.",
    "Rental applicant with perfect record rejected - landlord's nephew needed somewhere to live.",
    "Property manager conducts surprise inspection - tenant at work, notes 'unmade bed' as issue.",
    "Government housing scheme helps 12 families into homes - 12,000 still waiting."
];

// Initialize Game
function init() {
    const isNewGame = !localStorage.getItem('kiwiLandlordEmpire');
    loadGame();
    updateUI();
    setupEventListeners();
    startGameLoop();

    if (isNewGame) {
        addNews("Welcome to Kiwi Landlord Empire. You've inherited 3 mouldy flats. Your journey into moral bankruptcy begins now.");
        addNews("💡 TIP: Click the COLLECT RENT button to actively harass tenants for bonus payments!");
    }
}

// Game Loop
function startGameLoop() {
    setInterval(() => {
        if (gameState.speed === 0) return; // Paused

        const now = Date.now();
        const deltaTime = (now - gameState.lastUpdate) / 1000; // seconds elapsed
        gameState.lastUpdate = now;

        // Generate income
        const weeklyIncome = calculateWeeklyIncome();
        const incomeThisTick = (weeklyIncome / gameState.speed) * deltaTime;
        gameState.money += incomeThisTick;

        // Check for endings
        checkEndings();

        updateUI();
    }, 100); // Update 10 times per second

    // Random news every 30-60 seconds
    setInterval(() => {
        if (Math.random() > 0.5) {
            const randomNews = newsHeadlines[Math.floor(Math.random() * newsHeadlines.length)];
            addNews(randomNews);
        }
    }, 45000);

    // Random events every 60-120 seconds
    setInterval(() => {
        if (gameState.tenants > 0 && Math.random() > 0.6) {
            triggerRandomEvent();
        }
    }, 90000);
}

// Calculate Weekly Income
function calculateWeeklyIncome() {
    let total = 0;
    for (let key in gameState.properties) {
        total += gameState.properties[key].count * gameState.properties[key].income;
    }
    return total;
}

// Update UI
function updateUI() {
    // Money
    document.getElementById('money').textContent = formatMoney(gameState.money);
    document.getElementById('income-rate').textContent = formatMoney(calculateWeeklyIncome()) + '/week';

    // Moral Compass
    const moralLevel = getMoralLevel();
    document.getElementById('moral-value').textContent = moralLevel.name;

    // Political Power
    const politicalLevel = getPoliticalLevel();
    document.getElementById('political-value').textContent = politicalLevel.name;

    // Properties
    updatePropertyUI('moldyFlat', 'moldy-flat');
    updatePropertyUI('shitbox', 'shitbox');
    updatePropertyUI('leaky', 'leaky');
    updatePropertyUI('luxury', 'luxury');
    updatePropertyUI('block', 'block');

    // Tenants (count all properties)
    gameState.tenants = Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0);
    document.getElementById('total-tenants').textContent = gameState.tenants;
    document.getElementById('exploited-count').textContent = gameState.exploitedThisWeek;

    // Enable/disable buttons
    updateButtonStates();
}

function updatePropertyUI(propKey, propId) {
    const prop = gameState.properties[propKey];
    document.getElementById(`${propId}-count`).textContent = prop.count;
    document.getElementById(`${propId}-cost`).textContent = formatNumber(Math.floor(prop.cost));

    const buyBtn = document.getElementById(`buy-${propId}`);
    buyBtn.disabled = gameState.money < prop.cost;
}

function updateButtonStates() {
    // Enable evil actions if you have properties
    const hasProperties = gameState.tenants > 0;
    const totalProperties = Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0);
    const now = Date.now();

    // Collect Rent button with cooldown
    const collectRentBtn = document.getElementById('collect-rent');
    if (collectRentBtn) {
        const collectCooldown = 5000;
        const collectTimeLeft = Math.max(0, collectCooldown - (now - gameState.cooldowns.collectRent));
        collectRentBtn.disabled = !hasProperties || collectTimeLeft > 0;

        if (collectTimeLeft > 0) {
            collectRentBtn.textContent = `COLLECT RENT (${Math.ceil(collectTimeLeft / 1000)}s)`;
        } else {
            collectRentBtn.textContent = 'COLLECT RENT';
        }
    }

    // Raise Rents with cooldown
    const raiseRentsBtn = document.getElementById('raise-rents');
    const raiseRentsCooldown = 30000;
    const raiseRentsTimeLeft = Math.max(0, raiseRentsCooldown - (now - gameState.cooldowns.raiseRents));
    raiseRentsBtn.disabled = !hasProperties || raiseRentsTimeLeft > 0;

    // Bullshit Fees with cooldown
    const bullshitFeesBtn = document.getElementById('bullshit-fees');
    const bullshitCooldown = 45000;
    const bullshitTimeLeft = Math.max(0, bullshitCooldown - (now - gameState.cooldowns.bullshitFees));
    bullshitFeesBtn.disabled = !hasProperties || bullshitTimeLeft > 0;

    // Pet Bond with cooldown
    const petBondBtn = document.getElementById('pet-bond');
    const petBondCooldown = 60000;
    const petBondTimeLeft = Math.max(0, petBondCooldown - (now - gameState.cooldowns.petBond));
    petBondBtn.disabled = !hasProperties || petBondTimeLeft > 0;

    // Other actions without cooldowns
    document.getElementById('ignore-standards').disabled = !hasProperties;
    document.getElementById('no-cause-eviction').disabled = !hasProperties;
    document.getElementById('convert-airbnb').disabled = !hasProperties || gameState.money < 5000;
    document.getElementById('subdivide').disabled = !hasProperties || gameState.money < 10000;
    document.getElementById('overseas-investor').disabled = totalProperties === 0;

    // Political corruption
    const bribeCost = calculateBribeCost();
    const suppressCost = Math.floor(15000 * (1 + (100 - gameState.moral) / 100));
    document.getElementById('bribe-cost').textContent = formatNumber(bribeCost);
    document.getElementById('suppress-cost').textContent = formatNumber(suppressCost);

    document.getElementById('bribe-councillor').disabled = gameState.money < bribeCost;
    document.getElementById('lobby-bishop').disabled = gameState.money < 20000;

    // Suppress media requires Council Pest (150+ political)
    document.getElementById('suppress-media').disabled =
        gameState.money < suppressCost || gameState.political < 150;

    // Text Bill English requires Bishop's Mate (300+ political)
    document.getElementById('text-bill-english').disabled =
        gameState.money < 50000 || gameState.political < 300;

    // Kāinga Ora board requires Property Lobby (500+ political)
    document.getElementById('kainga-ora-board').disabled =
        gameState.money < 100000 || gameState.political < 500;

    // Unlock properties based on progression
    const totalPropertyCount = totalProperties;

    // Shitbox unlocks at 3 properties
    if (totalPropertyCount >= 3) {
        document.getElementById('buy-shitbox').disabled = gameState.money < gameState.properties.shitbox.cost;
    }

    // Leaky unlocks at 8 properties
    if (totalPropertyCount >= 8) {
        document.getElementById('buy-leaky').disabled = gameState.money < gameState.properties.leaky.cost;
    }

    // Luxury unlocks at 15 properties
    if (totalPropertyCount >= 15) {
        document.getElementById('buy-luxury').disabled = gameState.money < gameState.properties.luxury.cost;
    }

    // Block unlocks at 30 properties
    if (totalPropertyCount >= 30) {
        document.getElementById('buy-block').disabled = gameState.money < gameState.properties.block.cost;
    }
}

// Get Moral/Political Levels
function getMoralLevel() {
    for (let level of moralLevels) {
        if (gameState.moral >= level.threshold) return level;
    }
    return moralLevels[moralLevels.length - 1];
}

function getPoliticalLevel() {
    for (let i = politicalLevels.length - 1; i >= 0; i--) {
        if (gameState.political >= politicalLevels[i].threshold) {
            return politicalLevels[i];
        }
    }
    return politicalLevels[0];
}

// Calculate Bribe Cost (increases as moral drops)
function calculateBribeCost() {
    const baseCost = 5000;
    const moralModifier = (100 - gameState.moral) / 100; // 0-1
    return Math.floor(baseCost * (1 + moralModifier * 2)); // Up to 3x cost at 0 moral
}

// Buy Property
function buyProperty(propKey) {
    const prop = gameState.properties[propKey];
    if (gameState.money >= prop.cost) {
        gameState.money -= prop.cost;
        prop.count++;
        prop.cost = Math.floor(prop.cost * prop.costMultiplier);

        const propNames = {
            moldyFlat: "mouldy flat",
            shitbox: "earthquake-risk shitbox",
            leaky: "leaky building complex",
            luxury: "luxury 'investment' apartment",
            block: "entire apartment block"
        };

        addNews(`You purchased another ${propNames[propKey]}. A family's dream dies.`);
        updateUI();
    }
}

// Manual Rent Collection (Active Clicker Mechanic)
function collectRent() {
    if (gameState.tenants === 0) return;

    const now = Date.now();
    const cooldown = 5000; // 5 second cooldown

    if (now - gameState.cooldowns.collectRent < cooldown) {
        return; // Still on cooldown
    }

    // Collect bonus rent: $50-150 per tenant
    const perTenant = 50 + Math.floor(Math.random() * 100);
    const collected = perTenant * gameState.tenants;
    gameState.money += collected;
    gameState.cooldowns.collectRent = now;

    const messages = [
        `Knocked aggressively on doors. Collected $${formatNumber(collected)} in \"urgent payments\".`,
        `Sent threatening letters. Tenants coughed up $${formatNumber(collected)}.`,
        `Showed up unannounced during dinner. Extracted $${formatNumber(collected)}.`,
        `Mentioned \"possible rent increase\" casually. Received $${formatNumber(collected)} immediately.`,
        `Implied maintenance depends on prompt payment. Collected $${formatNumber(collected)}.`
    ];

    addNews(messages[Math.floor(Math.random() * messages.length)]);
    updateUI();
}

// Evil Actions
function raiseRents() {
    if (gameState.tenants === 0) return;

    const now = Date.now();
    const cooldown = 30000; // 30 second cooldown

    if (now - gameState.cooldowns.raiseRents < cooldown) {
        return; // Still on cooldown
    }

    const increase = gameState.tenants * 50;
    gameState.money += increase;
    gameState.political += 5;
    gameState.moral -= 3;
    gameState.actionsPerformed.rentRaises++;
    gameState.cooldowns.raiseRents = now;

    addNews(`Rent increased across all properties. Tenants tighten budgets. You gain $${increase}.`);
    updateUI();
}

function ignoreStandards() {
    if (gameState.tenants === 0) return;

    const savings = gameState.tenants * 200;
    gameState.money += savings;
    gameState.moral -= 10;
    gameState.actionsPerformed.violations++;

    addNews(`Healthy Homes Standards ignored. Mould thrives. Tenants wheeze. You save $${savings}.`);
    updateUI();
}

function bullshitFees() {
    if (gameState.tenants === 0) return;

    const now = Date.now();
    const cooldown = 45000; // 45 second cooldown

    if (now - gameState.cooldowns.bullshitFees < cooldown) {
        return; // Still on cooldown
    }

    gameState.money += 2000;
    gameState.moral -= 5;
    gameState.cooldowns.bullshitFees = now;

    const fees = [
        "\"Administrative processing fee\"",
        "\"Garden maintenance levy\"",
        "\"Parking space rental\"",
        "\"Communal area upkeep charge\"",
        "\"Letterbox usage fee\""
    ];

    const randomFee = fees[Math.floor(Math.random() * fees.length)];
    addNews(`Invented new fee: ${randomFee}. Tenants pay. You profit $2,000.`);
    updateUI();
}

function noCauseEviction() {
    if (gameState.tenants === 0) return;

    gameState.moral -= 20;
    gameState.political += 10;
    gameState.exploitedThisWeek++;
    gameState.actionsPerformed.evictions++;

    addNews(`90-day no-cause eviction issued. Tenant finds nowhere to go. Chris Bishop approves.`);
    updateUI();
}

function convertToAirbnb() {
    if (gameState.tenants === 0 || gameState.money < 5000) return;

    gameState.money -= 5000;
    gameState.money += 15000;
    gameState.moral -= 15;

    addNews(`Converted rental to Airbnb. Long-term tenant evicted. Tourism wins, housing loses.`);
    updateUI();
}

function subdivide() {
    if (gameState.tenants === 0 || gameState.money < 10000) return;

    gameState.money -= 10000;
    gameState.moral -= 25;

    // Double income of a random property type
    const propertyTypes = Object.keys(gameState.properties).filter(key => gameState.properties[key].count > 0);
    if (propertyTypes.length > 0) {
        const randomType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
        gameState.properties[randomType].income *= 2;

        addNews(`Subdivided property. Crammed 2 families into space for 1. Building code? What's that?`);
    }

    updateUI();
}

function demandPetBond() {
    if (gameState.tenants === 0) return;

    const now = Date.now();
    const cooldown = 60000; // 60 second cooldown

    if (now - gameState.cooldowns.petBond < cooldown) {
        return; // Still on cooldown
    }

    gameState.money += 3000;
    gameState.moral -= 5;
    gameState.cooldowns.petBond = now;

    const petTypes = ["goldfish", "hamster", "budgie", "cat that visits sometimes"];
    const randomPet = petTypes[Math.floor(Math.random() * petTypes.length)];

    addNews(`Demanded 2-week pet bond for tenant's ${randomPet}. Legally dubious, financially lucrative.`);
    updateUI();
}

function sellToOverseasInvestor() {
    // Find the most expensive property owned
    let mostExpensiveProp = null;
    let highestValue = 0;

    for (let key in gameState.properties) {
        if (gameState.properties[key].count > 0) {
            const value = gameState.properties[key].cost / gameState.properties[key].costMultiplier;
            if (value > highestValue) {
                highestValue = value;
                mostExpensiveProp = key;
            }
        }
    }

    if (mostExpensiveProp) {
        const salePrice = Math.floor(highestValue * 2);
        gameState.properties[mostExpensiveProp].count--;
        gameState.money += salePrice;
        gameState.political += 10;

        addNews(`Sold property to overseas investor for $${formatNumber(salePrice)}. Another home lost to foreign ownership.`);
        updateUI();
    }
}

// Political Corruption
function bribeCouncillor() {
    const cost = calculateBribeCost();
    if (gameState.money >= cost) {
        gameState.money -= cost;
        gameState.political += 25;
        gameState.actionsPerformed.bribes++;

        addNews(`Local councillor bribed. Building consent mysteriously approved overnight.`);
        updateUI();
    }
}

function lobbyBishop() {
    if (gameState.money >= 20000) {
        gameState.money -= 20000;
        gameState.political += 50;
        gameState.actionsPerformed.bribes++;

        addNews(`Donation to Chris Bishop received. He calls you \"a great Kiwi doing your bit for housing\".`);
        updateUI();
    }
}

function suppressMedia() {
    const cost = Math.floor(15000 * (1 + (100 - gameState.moral) / 100));
    if (gameState.money >= cost && gameState.political >= 150) {
        gameState.money -= cost;
        gameState.political += 30;
        gameState.actionsPerformed.bribes++;

        addNews(`RNZ investigation into your slum empire mysteriously shelved. Press freedom? Never heard of it.`);
        updateUI();
    }
}

function textBillEnglish() {
    if (gameState.money >= 50000 && gameState.political >= 300) {
        gameState.money -= 50000;
        gameState.political += 100;
        gameState.actionsPerformed.bribes++;

        addNews(`Casual text to Sir Bill English. He'll handle that pesky Cabinet approval process for you.`);
        updateUI();
    }
}

function appointToKaingaOra() {
    if (gameState.money >= 100000 && gameState.political >= 500) {
        gameState.money -= 100000;

        // Trigger ending
        showEnding('kaingaOra');
    }
}

// News Feed
function addNews(text) {
    const newsFeed = document.getElementById('news-feed');
    const newsItem = document.createElement('div');
    newsItem.className = 'news-item';

    const time = new Date().toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' });
    newsItem.innerHTML = `<strong>[${time}]</strong> ${text}`;

    newsFeed.insertBefore(newsItem, newsFeed.firstChild);

    // Keep only last 20 news items
    while (newsFeed.children.length > 20) {
        newsFeed.removeChild(newsFeed.lastChild);
    }

    gameState.newsHistory.push({ time: Date.now(), text });
}

// Speed Controls
function setSpeed(speed) {
    gameState.speed = speed;
    gameState.lastUpdate = Date.now(); // Reset timer to prevent jumps

    // Update active button
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.speed) === speed) {
            btn.classList.add('active');
        }
    });
}

// Save/Load
function saveGame() {
    localStorage.setItem('kiwiLandlordEmpire', JSON.stringify(gameState));
    addNews('Game saved. Your empire of exploitation preserved for posterity.');
}

function loadGame() {
    const saved = localStorage.getItem('kiwiLandlordEmpire');
    if (saved) {
        const loaded = JSON.parse(saved);
        Object.assign(gameState, loaded);
        gameState.lastUpdate = Date.now(); // Reset timer

        // Migration: Fix old saves from before the new starting state
        const totalProperties = Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0);
        if (totalProperties === 0) {
            // Old save with no properties - give them 3 Mouldy Flats
            gameState.properties.moldyFlat.count = 3;
            gameState.properties.moldyFlat.cost = 66125;
            gameState.money = 0;
            addNews('🎁 SYSTEM UPDATE: You now start with 3 Mouldy Flats! Game rebalanced for better pacing.');
        }

        // Ensure cooldowns object exists for old saves
        if (!gameState.cooldowns) {
            gameState.cooldowns = {
                collectRent: 0,
                raiseRents: 0,
                bullshitFees: 0,
                petBond: 0
            };
        }

        addNews('Game loaded. Welcome back, slumlord.');
    }
}

function resetGame() {
    if (confirm('Reset your empire? All properties, tenants, and ill-gotten gains will be lost.')) {
        localStorage.removeItem('kiwiLandlordEmpire');
        location.reload();
    }
}

function shareStats() {
    const totalProperties = Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0);
    const stats = `
🏚️ KIWI LANDLORD EMPIRE 🏚️

My Slumlord Stats:
💰 Cash: ${formatMoney(gameState.money)}
🏠 Properties: ${totalProperties}
👥 Tenants Exploited: ${gameState.tenants}
📊 Weekly Income: ${formatMoney(calculateWeeklyIncome())}

🧭 Moral Compass: ${getMoralLevel().name}
🎭 Political Power: ${getPoliticalLevel().name}

📋 Evil Deeds:
• Rent Raises: ${gameState.actionsPerformed.rentRaises}
• No-Cause Evictions: ${gameState.actionsPerformed.evictions}
• Healthy Homes Violations: ${gameState.actionsPerformed.violations}
• Bribes Paid: ${gameState.actionsPerformed.bribes}

A biting satire of NZ's housing crisis.
Play at: [Your URL Here]
`.trim();

    // Copy to clipboard
    if (navigator.clipboard) {
        navigator.clipboard.writeText(stats).then(() => {
            addNews("📋 Stats copied to clipboard! Share your empire of exploitation with the world.");
        }).catch(() => {
            // Fallback: show in alert
            alert(stats);
            addNews("📋 Stats displayed. Copy manually to share your shameful achievements.");
        });
    } else {
        // Fallback for older browsers
        alert(stats);
        addNews("📋 Stats displayed. Copy manually to share your shameful achievements.");
    }
}

// Event Listeners
function setupEventListeners() {
    // Active Rent Collection
    document.getElementById('collect-rent').addEventListener('click', collectRent);

    // Properties
    document.getElementById('buy-moldy-flat').addEventListener('click', () => buyProperty('moldyFlat'));
    document.getElementById('buy-shitbox').addEventListener('click', () => buyProperty('shitbox'));
    document.getElementById('buy-leaky').addEventListener('click', () => buyProperty('leaky'));
    document.getElementById('buy-luxury').addEventListener('click', () => buyProperty('luxury'));
    document.getElementById('buy-block').addEventListener('click', () => buyProperty('block'));

    // Evil Actions
    document.getElementById('raise-rents').addEventListener('click', raiseRents);
    document.getElementById('ignore-standards').addEventListener('click', ignoreStandards);
    document.getElementById('bullshit-fees').addEventListener('click', bullshitFees);
    document.getElementById('no-cause-eviction').addEventListener('click', noCauseEviction);
    document.getElementById('convert-airbnb').addEventListener('click', convertToAirbnb);
    document.getElementById('subdivide').addEventListener('click', subdivide);
    document.getElementById('pet-bond').addEventListener('click', demandPetBond);
    document.getElementById('overseas-investor').addEventListener('click', sellToOverseasInvestor);

    // Political Corruption
    document.getElementById('bribe-councillor').addEventListener('click', bribeCouncillor);
    document.getElementById('lobby-bishop').addEventListener('click', lobbyBishop);
    document.getElementById('suppress-media').addEventListener('click', suppressMedia);
    document.getElementById('text-bill-english').addEventListener('click', textBillEnglish);
    document.getElementById('kainga-ora-board').addEventListener('click', appointToKaingaOra);

    // Speed Controls
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => setSpeed(parseInt(btn.dataset.speed)));
    });

    // Save/Reset/Share
    document.getElementById('save-game').addEventListener('click', saveGame);
    document.getElementById('share-stats').addEventListener('click', shareStats);
    document.getElementById('reset-game').addEventListener('click', resetGame);

    // Auto-save every 30 seconds
    setInterval(saveGame, 30000);
}

// Random Events System
function triggerRandomEvent() {
    const events = [
        {
            name: "Healthy Homes Inspection",
            condition: () => gameState.actionsPerformed.violations > 0,
            effect: () => {
                if (gameState.political >= 150) {
                    addNews("⚠️ EVENT: Healthy Homes inspector arrives. You make a phone call. Inspector leaves. Nothing to see here.");
                    gameState.political -= 10;
                } else {
                    const fine = gameState.tenants * 1000;
                    gameState.money -= fine;
                    addNews(`⚠️ EVENT: Healthy Homes inspection failed! Fined $${formatNumber(fine)}. Should've bribed harder.`);
                }
            }
        },
        {
            name: "Tenant Organizes Union",
            condition: () => gameState.tenants >= 10 && gameState.actionsPerformed.rentRaises > 5,
            effect: () => {
                gameState.moral -= 15;
                addNews("⚠️ EVENT: Your tenants formed a renters union. They're comparing notes on your 'bullshit fees'.");
            }
        },
        {
            name: "Interest Rate Rise",
            condition: () => Math.random() > 0.7,
            effect: () => {
                const cost = Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0) * 500;
                gameState.money -= cost;
                addNews(`⚠️ EVENT: Interest rates spike! Mortgage costs up $${formatNumber(cost)}/week. Thanks RBNZ.`);
            }
        },
        {
            name: "Migration Surge",
            condition: () => Math.random() > 0.8,
            effect: () => {
                const bonus = gameState.tenants * 200;
                gameState.money += bonus;
                addNews(`✅ EVENT: Unexpected migration surge! Demand skyrockets. You raise rent immediately. +$${formatNumber(bonus)}`);
            }
        },
        {
            name: "Mould Outbreak",
            condition: () => gameState.actionsPerformed.violations > 3,
            effect: () => {
                const remediation = gameState.tenants * 800;
                gameState.money -= remediation;
                gameState.moral -= 10;
                addNews(`⚠️ EVENT: Black mould outbreak in multiple properties. Forced to remediate. Cost: $${formatNumber(remediation)}`);
            }
        },
        {
            name: "Spinoff Exposé",
            condition: () => gameState.moral < 40 && gameState.political < 300,
            effect: () => {
                gameState.moral -= 20;
                gameState.political -= 30;
                addNews("⚠️ EVENT: The Spinoff publishes exposé on your slumlord empire. Public opinion turns. Can't suppress this one.");
            }
        },
        {
            name: "Government Subsidy Announced",
            condition: () => gameState.political >= 100,
            effect: () => {
                const subsidy = gameState.tenants * 150;
                gameState.money += subsidy;
                addNews(`✅ EVENT: Government announces rental subsidy. Your political connections ensure you benefit. +$${formatNumber(subsidy)}`);
            }
        },
        {
            name: "Earthquake Damage",
            condition: () => gameState.properties.shitbox.count > 0,
            effect: () => {
                const damage = gameState.properties.shitbox.count * 5000;
                gameState.money -= damage;
                addNews(`⚠️ EVENT: Minor earthquake damages your shitboxes. Insurance doesn't cover 'pre-existing structural defects'. -$${formatNumber(damage)}`);
            }
        },
        {
            name: "Tenant Falls Through Floor",
            condition: () => gameState.actionsPerformed.violations >= 5,
            effect: () => {
                gameState.money -= 15000;
                gameState.moral -= 25;
                addNews("⚠️ EVENT: Tenant falls through rotted floor. ACC investigates. Legal fees mount. You blame tenant for 'excessive walking'.");
            }
        },
        {
            name: "Bishop Announcement",
            condition: () => gameState.political >= 200,
            effect: () => {
                gameState.political += 20;
                addNews("✅ EVENT: Chris Bishop announces new landlord-friendly legislation. You're quoted as 'valuable stakeholder'. +20 Political.");
            }
        },
        {
            name: "Market Correction",
            condition: () => Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0) >= 20,
            effect: () => {
                // Reduce property costs by 10%
                for (let key in gameState.properties) {
                    gameState.properties[key].cost = Math.floor(gameState.properties[key].cost * 0.9);
                }
                addNews("⚠️ EVENT: Housing market correction! Property values drop 10%. Your overleveraged empire wobbles.");
            }
        },
        {
            name: "Overseas Investment Boom",
            condition: () => Math.random() > 0.85,
            effect: () => {
                const offer = 50000 * (1 + Math.random());
                gameState.money += offer;
                addNews(`✅ EVENT: Chinese investor makes unsolicited cash offer. You accept immediately. +$${formatNumber(offer)}`);
            }
        }
    ];

    // Filter events that meet conditions
    const availableEvents = events.filter(event => event.condition());

    if (availableEvents.length > 0) {
        const selectedEvent = availableEvents[Math.floor(Math.random() * availableEvents.length)];
        selectedEvent.effect();
        updateUI();
    }
}

// Endings System
function showEnding(endingType) {
    const endings = {
        kaingaOra: {
            title: "The Kāinga Ora Appointment",
            text: `
                <p>Congratulations! You've been appointed to the Kāinga Ora board.</p>
                <p>Just like Sir Bill English's 2024 text message appointment, you bypassed Cabinet approval with a casual text to your political mates.</p>
                <p>You—a notorious slumlord with <strong>${gameState.actionsPerformed.violations} violations</strong>, <strong>${gameState.actionsPerformed.evictions} no-cause evictions</strong>, and a moral compass reading "<strong>${getMoralLevel().name}</strong>"—are now in charge of fixing NZ's social housing crisis.</p>
                <p>The irony is so thick you could charge rent on it.</p>
                <p><strong>Final Stats:</strong></p>
                <ul>
                    <li>Properties Owned: ${Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0)}</li>
                    <li>Cash: ${formatMoney(gameState.money)}</li>
                    <li>Tenants Exploited: ${gameState.tenants}</li>
                    <li>Political Power: ${getPoliticalLevel().name}</li>
                </ul>
            `
        },
        propertyBaron: {
            title: "The Property Baron",
            text: `
                <p>You did it. You own <strong>100+ properties</strong> across Aotearoa.</p>
                <p>First-home buyers have given up. Young families resign to renting forever. Auckland's median house price is now 15 years of savings.</p>
                <p>Chris Bishop calls you "a great contributor to housing supply." The Spinoff writes an exposé. You suppress it with a phone call.</p>
                <p>Congratulations, you've won capitalism. Everyone else lost.</p>
            `
        },
        marketCollapse: {
            title: "The Market Collapse",
            text: `
                <p>The inevitable happened. You over-leveraged.</p>
                <p>Migration dropped 74%. Your properties sit empty for months. Interest rates crushed you. Rent drops 11.8%.</p>
                <p>You declared bankruptcy with <strong>${formatMoney(gameState.money)}</strong> in debt.</p>
                <p>All those no-cause evictions, all that bribery, all those Healthy Homes violations... for nothing.</p>
                <p>Welcome to the 2025 NZ rental market reality.</p>
            `
        },
        journalism: {
            title: "Investigative Journalism Takedown",
            text: `
                <p><strong>RNZ EXCLUSIVE: Slumlord Empire Exposed</strong></p>
                <p>An RNZ investigation has uncovered your empire of exploitation:</p>
                <ul>
                    <li>${gameState.actionsPerformed.violations} Healthy Homes violations</li>
                    <li>${gameState.actionsPerformed.evictions} No-cause evictions</li>
                    <li>${gameState.actionsPerformed.bribes} Documented bribes</li>
                </ul>
                <p>The Tenancy Tribunal has ruled against you. Your properties are seized. You're banned from property ownership.</p>
                <p>Turns out, even in NZ, there are some consequences. Sometimes.</p>
            `
        }
    };

    const ending = endings[endingType];

    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    `;

    content.innerHTML = `
        <h1 style="color: var(--teal-primary); margin-bottom: 20px;">${ending.title}</h1>
        <div style="line-height: 1.8; color: var(--dark-text);">${ending.text}</div>
        <button onclick="location.reload()" style="
            margin-top: 30px;
            padding: 15px 30px;
            background: var(--teal-primary);
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
        ">Play Again</button>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Stop the game
    gameState.speed = 0;
}

// Check for endings on each update
function checkEndings() {
    const totalProperties = Object.values(gameState.properties).reduce((sum, prop) => sum + prop.count, 0);

    // Property Baron ending - 100+ properties
    if (totalProperties >= 100) {
        showEnding('propertyBaron');
        return;
    }

    // Market Collapse - negative money with 10+ properties
    if (gameState.money < -100000 && totalProperties >= 10) {
        showEnding('marketCollapse');
        return;
    }

    // Journalism takedown - high violations, low political power
    if (gameState.actionsPerformed.violations >= 20 && gameState.political < 200 && gameState.moral < 30) {
        showEnding('journalism');
        return;
    }
}

// Utility Functions
function formatMoney(amount) {
    return '$' + formatNumber(Math.floor(amount));
}

function formatNumber(num) {
    return num.toLocaleString('en-NZ');
}

// Start the game
init();
