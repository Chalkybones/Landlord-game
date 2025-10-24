// Kiwi Landlord Empire - Game Logic
// A biting satire of NZ's housing crisis

// Game State
const gameState = {
    money: 0,
    moral: 100, // 0-100, lower is more evil
    political: 0, // 0-1000+, higher unlocks more corruption

    properties: {
        moldyFlat: { count: 0, cost: 50000, income: 150, costMultiplier: 1.15 },
        shitbox: { count: 0, cost: 200000, income: 500, costMultiplier: 1.18 }
    },

    tenants: 0,
    exploitedThisWeek: 0,

    speed: 10, // seconds per week
    lastUpdate: Date.now(),

    newsHistory: [],
    actionsPerformed: {
        rentRaises: 0,
        evictions: 0,
        violations: 0,
        bribes: 0
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

// News Headlines Pool
const newsHeadlines = [
    "Chris Bishop claims no-cause evictions are 'pro-tenant' - renters confused.",
    "Migration down 74%: Your empty properties gather dust as economists celebrate.",
    "Wellington rent drops 11.8% - but you still can't find tenants.",
    "Nicola Willis celebrates: Only 591 families in emergency housing! (Down from 3,141)",
    "Kāinga Ora posts $700m deficit - Sir Bill English appointed via text to investigate.",
    "First home buyers now need 15 years of savings for a deposit on your mouldy flat.",
    "Healthy Homes Standards? More like 'Suggestions', say landlords.",
    "Auckland property sits empty for 24 days on average - but Bishop says we need more supply.",
    "Interest deductibility fully restored! Your accountant sends a thank you card.",
    "Tenant asks for heat pump - you counter-offer with one more layer of clothes.",
    "RNZ investigates rising rental costs - you quietly raise rent by $50/week.",
    "Pet bond legislation passes: Landlords can now charge 2 weeks rent for a goldfish.",
    "Local family outbid by investor (you) - again.",
    "Council votes to intensify housing - your property value mysteriously increases.",
    "Tenancy Tribunal backlog hits 6 months - you exploit the delay.",
    "Cost of living crisis deepens - your tenants ask for rent freeze, you laugh.",
    "Student flat condemned by council - you relabel it 'rustic charm' and re-list for more."
];

// Initialize Game
function init() {
    loadGame();
    updateUI();
    setupEventListeners();
    startGameLoop();
    addNews("Welcome to Kiwi Landlord Empire. Your journey into moral bankruptcy begins now.");
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

        updateUI();
    }, 100); // Update 10 times per second

    // Random news every 30-60 seconds
    setInterval(() => {
        if (Math.random() > 0.5) {
            const randomNews = newsHeadlines[Math.floor(Math.random() * newsHeadlines.length)];
            addNews(randomNews);
        }
    }, 45000);
}

// Calculate Weekly Income
function calculateWeeklyIncome() {
    let total = 0;
    total += gameState.properties.moldyFlat.count * gameState.properties.moldyFlat.income;
    total += gameState.properties.shitbox.count * gameState.properties.shitbox.income;
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

    // Tenants
    gameState.tenants = gameState.properties.moldyFlat.count + gameState.properties.shitbox.count;
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
    document.getElementById('raise-rents').disabled = !hasProperties;
    document.getElementById('ignore-standards').disabled = !hasProperties;
    document.getElementById('bullshit-fees').disabled = !hasProperties;
    document.getElementById('no-cause-eviction').disabled = !hasProperties;

    // Political corruption
    const bribeCost = calculateBribeCost();
    document.getElementById('bribe-cost').textContent = formatNumber(bribeCost);
    document.getElementById('bribe-councillor').disabled = gameState.money < bribeCost;
    document.getElementById('lobby-bishop').disabled = gameState.money < 20000;

    // Unlock shitbox at 3 properties
    if (gameState.properties.moldyFlat.count >= 3) {
        document.getElementById('buy-shitbox').disabled = gameState.money < gameState.properties.shitbox.cost;
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
            shitbox: "earthquake-risk shitbox"
        };

        addNews(`You purchased another ${propNames[propKey]}. A family's dream dies.`);
        updateUI();
    }
}

// Evil Actions
function raiseRents() {
    if (gameState.tenants === 0) return;

    const increase = gameState.tenants * 50;
    gameState.money += increase;
    gameState.political += 5;
    gameState.moral -= 3;
    gameState.actionsPerformed.rentRaises++;

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

    gameState.money += 2000;
    gameState.moral -= 5;

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
        addNews('Game loaded. Welcome back, slumlord.');
    }
}

function resetGame() {
    if (confirm('Reset your empire? All properties, tenants, and ill-gotten gains will be lost.')) {
        localStorage.removeItem('kiwiLandlordEmpire');
        location.reload();
    }
}

// Event Listeners
function setupEventListeners() {
    // Properties
    document.getElementById('buy-moldy-flat').addEventListener('click', () => buyProperty('moldyFlat'));
    document.getElementById('buy-shitbox').addEventListener('click', () => buyProperty('shitbox'));

    // Evil Actions
    document.getElementById('raise-rents').addEventListener('click', raiseRents);
    document.getElementById('ignore-standards').addEventListener('click', ignoreStandards);
    document.getElementById('bullshit-fees').addEventListener('click', bullshitFees);
    document.getElementById('no-cause-eviction').addEventListener('click', noCauseEviction);

    // Political Corruption
    document.getElementById('bribe-councillor').addEventListener('click', bribeCouncillor);
    document.getElementById('lobby-bishop').addEventListener('click', lobbyBishop);

    // Speed Controls
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', () => setSpeed(parseInt(btn.dataset.speed)));
    });

    // Save/Reset
    document.getElementById('save-game').addEventListener('click', saveGame);
    document.getElementById('reset-game').addEventListener('click', resetGame);

    // Auto-save every 30 seconds
    setInterval(saveGame, 30000);
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
