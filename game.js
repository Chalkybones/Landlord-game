// Kiwi Landlord Empire - Game Logic
// A biting satire of NZ's housing crisis

// Game State
const gameState = {
    money: 0,
    moral: 100, // 0-100, lower is more evil
    political: 0, // 0-1000+, higher unlocks more corruption

    properties: {
        moldyFlat: { count: 0, cost: 50000, income: 150, costMultiplier: 1.15 },
        shitbox: { count: 0, cost: 200000, income: 500, costMultiplier: 1.18 },
        leaky: { count: 0, cost: 500000, income: 1200, costMultiplier: 1.20 },
        luxury: { count: 0, cost: 1200000, income: 2500, costMultiplier: 1.22 },
        block: { count: 0, cost: 5000000, income: 8000, costMultiplier: 1.25 }
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
    "Student flat condemned by council - you relabel it 'rustic charm' and re-list for more.",
    "Government promises to 'flood market with houses' - landlords already drowning in vacancies.",
    "Tenant reports mould to council - you increase rent to cover 'administrative stress'.",
    "Christchurch council defies housing law - Bishop vows 'the culture of no is over'.",
    "National median house price falls 3.9% - but somehow still unaffordable.",
    "Your tenant's budgie triggers 2-week pet bond. Tenant sells budgie. You keep the bond.",
    "Breaking: Another Airbnb conversion removes long-term rental from market.",
    "Bishop calls landlords 'not the enemies' - renters laugh bitterly.",
    "Overseas investor buys entire street - locals priced out of own neighbourhood.",
    "Tenancy law changes benefit landlords - opposition calls it 'reversing tenant rights'.",
    "Interest rates finally drop - but you already raised rent last month.",
    "Bishop rejects 17 of 20 council opt-out requests - democracy suspended for housing growth.",
    "Kāinga Ora forced to sell 900 homes per year while housing waitlist grows.",
    "Government claims housing crisis solved - 20,000 families on waitlist disagree.",
    "Tenant asks about insulation - you send link to Warehouse blanket sale.",
    "Property investor seminar teaches 'creative' ways to avoid Healthy Homes compliance.",
    "Your leaky building generates mould faster than it generates rent.",
    "Council finds unsafe wiring in your rental - you blame previous owner from 1987.",
    "Subdivision application approved overnight after mysterious 'donation'.",
    "Tenant falls through rotten deck - you send invoice for 'property damage'.",
    "90-day notice issued - tenant has nowhere to go in tightest rental market on record.",
    "Media reports housing crisis - you feature as 'entrepreneur solving supply problem'."
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

    document.getElementById('raise-rents').disabled = !hasProperties;
    document.getElementById('ignore-standards').disabled = !hasProperties;
    document.getElementById('bullshit-fees').disabled = !hasProperties;
    document.getElementById('no-cause-eviction').disabled = !hasProperties;
    document.getElementById('convert-airbnb').disabled = !hasProperties || gameState.money < 5000;
    document.getElementById('subdivide').disabled = !hasProperties || gameState.money < 10000;
    document.getElementById('pet-bond').disabled = !hasProperties;
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

    gameState.money += 3000;
    gameState.moral -= 5;

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

    // Save/Reset
    document.getElementById('save-game').addEventListener('click', saveGame);
    document.getElementById('reset-game').addEventListener('click', resetGame);

    // Auto-save every 30 seconds
    setInterval(saveGame, 30000);
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
