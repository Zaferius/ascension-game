// Texas Hold'em minigame
// Depends on: $ (constants.js), game (gladiator_game.js)

const texasHoldem = {
    deck: [],
    playerHand: [],
    dealerHand: [],
    communityCards: [],
    bet: 0,
    ante: 0,
    active: false,
    street: 'preflop',
    lastRevealCount: 0,
    updateBetUI() {
        const total = $('th-bet-total');
        if (total) total.innerText = this.bet;
        const previewPot = $('th-pot-preview');
        if (previewPot) previewPot.innerText = this.bet * 2;
        const pot = $('th-pot-total');
        if (pot) pot.innerText = this.bet * 2;
    },
    syncGoldUI() {
        const gold = $('th-gold');
        if (gold && game.player) gold.innerText = game.player.gold;
    },
    setMessage(message) {
        const node = $('th-msg');
        if (node) node.innerText = message || '';
    },
    resetState() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.communityCards = [];
        this.bet = 0;
        this.ante = 0;
        this.active = false;
        this.street = 'preflop';
        this.lastRevealCount = 0;
    },
    showIdleTable() {
        $('th-game').classList.remove('hidden');
        $('th-betbar').classList.remove('hidden');
        $('th-controls').classList.add('hidden');
        $('th-reset').classList.add('hidden');
    },
    open() {
        this.resetState();
        this.showIdleTable();
        $('th-player-hand').innerHTML = '';
        $('th-dealer-hand').innerHTML = '';
        $('th-board').innerHTML = '';
        $('th-player-best').innerText = 'No hand yet';
        $('th-dealer-best').innerText = 'Dealer hidden';
        $('th-street-label').innerText = 'Pre-Flop';
        const result = $('th-result-overlay');
        if (result) {
            result.classList.add('hidden');
            result.classList.remove('visible');
        }
        this.setMessage('Set your bet, then deal into the hand.');
        this.syncGoldUI();
        this.updateBetUI();
    },
    close() {
        if (window.gamble) return gamble.close();
        $('modal-gamble').classList.add('hidden');
        game.updateHubUI();
    },
    addBet(amount) {
        if (!game.player) return;
        this.bet = Math.min(game.player.gold, Math.max(0, this.bet + amount));
        this.updateBetUI();
    },
    clearBet() {
        this.bet = 0;
        this.updateBetUI();
    },
    maxBet() {
        if (!game.player) return;
        this.bet = Math.max(0, game.player.gold);
        this.updateBetUI();
    },
    createDeck() {
        const suits = ['♠', '♥', '♣', '♦'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        suits.forEach((suit) => values.forEach((value) => this.deck.push({ suit, val: value })));
        this.deck.sort(() => Math.random() - 0.5);
    },
    getCardValue(card) {
        if (card.val === 'A') return 14;
        if (card.val === 'K') return 13;
        if (card.val === 'Q') return 12;
        if (card.val === 'J') return 11;
        return parseInt(card.val, 10);
    },
    getStreetLabel() {
        if (this.street === 'preflop') return 'Pre-Flop';
        if (this.street === 'flop') return 'Flop';
        if (this.street === 'turn') return 'Turn';
        if (this.street === 'river') return 'River';
        return 'Showdown';
    },
    deal() {
        const buyIn = this.bet;
        if (isNaN(buyIn) || buyIn <= 0 || buyIn > game.player.gold) {
            alert('Invalid bet');
            return;
        }
        this.ante = buyIn;
        game.player.gold -= buyIn;
        this.createDeck();
        this.playerHand = [this.deck.pop(), this.deck.pop()];
        this.dealerHand = [this.deck.pop(), this.deck.pop()];
        this.communityCards = [];
        this.active = true;
        this.street = 'preflop';
        this.lastRevealCount = 2;
        $('th-game').classList.remove('hidden');
        $('th-betbar').classList.add('hidden');
        $('th-controls').classList.remove('hidden');
        $('th-reset').classList.add('hidden');
        this.syncGoldUI();
        this.updateBetUI();
        this.setMessage('Pre-flop. Read the room and choose your line.');
        this.render(false);
    },
    checkCall() {
        if (!this.active) return;
        this.advanceStreet('You check and let the hand roll onward.');
    },
    raise() {
        if (!this.active) return;
        const maxRaise = game.player.gold;
        if (maxRaise <= 0) {
            alert('Not enough gold to raise.');
            return;
        }

        const suggestedRaise = Math.max(1, Math.min(this.ante || this.bet || 1, maxRaise));
        const input = prompt(`Raise amount? (1-${maxRaise})`, suggestedRaise);
        if (input === null) return;

        const raiseAmount = parseInt(input, 10);
        if (isNaN(raiseAmount) || raiseAmount < 1 || raiseAmount > maxRaise) {
            alert(`Enter a raise between 1 and ${maxRaise}.`);
            return;
        }

        game.player.gold -= raiseAmount;
        this.bet += raiseAmount;
        this.syncGoldUI();
        this.updateBetUI();
        this.advanceStreet(`You press the action and add ${raiseAmount} gold to the pot.`);
    },
    fold() {
        if (!this.active) return;
        this.active = false;
        this.render(false);
        $('th-betbar').classList.remove('hidden');
        $('th-controls').classList.add('hidden');
        $('th-reset').classList.remove('hidden');
        this.setMessage('You fold and leave the dealer the pot.');
        this.showResult('YOU FOLDED', '#ff6b6b');
        game.saveGame();
    },
    advanceStreet(message) {
        if (this.street === 'preflop') {
            this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
            this.street = 'flop';
            this.lastRevealCount = 3;
        } else if (this.street === 'flop') {
            this.communityCards.push(this.deck.pop());
            this.street = 'turn';
            this.lastRevealCount = 1;
        } else if (this.street === 'turn') {
            this.communityCards.push(this.deck.pop());
            this.street = 'river';
            this.lastRevealCount = 1;
        } else {
            this.showdown();
            return;
        }
        this.setMessage(message || 'The dealer slides another card into the light.');
        this.render(false);
    },
    showdown() {
        this.active = false;
        this.street = 'showdown';
        this.lastRevealCount = 2;
        this.render(true);
        $('th-betbar').classList.remove('hidden');
        $('th-controls').classList.add('hidden');
        $('th-reset').classList.remove('hidden');

        const playerResult = this.evaluateHand(this.playerHand.concat(this.communityCards));
        const dealerResult = this.evaluateHand(this.dealerHand.concat(this.communityCards));
        const comparison = this.compareHands(playerResult, dealerResult);

        let text = 'PUSH';
        let color = '#f3d78a';
        if (comparison === 0) {
            game.player.gold += this.bet;
            this.setMessage(`Push. Both tables finish with ${playerResult.label}.`);
        } else if (comparison > 0) {
            text = 'YOU WIN';
            color = '#6fe0a8';
            game.player.gold += this.bet * 2;
            this.setMessage(`Your ${playerResult.label} beats the dealer's ${dealerResult.label}.`);
        } else {
            text = 'HOUSE WINS';
            color = '#ff6b6b';
            this.setMessage(`Dealer's ${dealerResult.label} tops your ${playerResult.label}.`);
        }

        this.syncGoldUI();
        this.showResult(text, color);
        game.saveGame();
    },
    showResult(text, color) {
        const overlay = $('th-result-overlay');
        const label = $('th-result-text');
        if (!overlay || !label) return;
        label.innerText = text;
        label.style.color = color;
        overlay.classList.remove('hidden');
        overlay.classList.remove('visible');
        setTimeout(() => { overlay.classList.add('visible'); }, 200);
    },
    findStraightHigh(values) {
        const unique = Array.from(new Set(values)).sort((a, b) => a - b);
        if (unique.includes(14)) unique.unshift(1);
        let run = 1;
        let bestHigh = 0;
        for (let i = 1; i < unique.length; i++) {
            if (unique[i] === unique[i - 1] + 1) {
                run++;
                if (run >= 5) bestHigh = unique[i];
            } else if (unique[i] !== unique[i - 1]) {
                run = 1;
            }
        }
        return bestHigh;
    },
    compareValues(left, right) {
        const max = Math.max(left.length, right.length);
        for (let i = 0; i < max; i++) {
            const a = left[i] || 0;
            const b = right[i] || 0;
            if (a !== b) return a > b ? 1 : -1;
        }
        return 0;
    },
    compareHands(playerResult, dealerResult) {
        if (playerResult.rank !== dealerResult.rank) return playerResult.rank > dealerResult.rank ? 1 : -1;
        return this.compareValues(playerResult.values, dealerResult.values);
    },
    evaluateHand(cards) {
        const values = cards.map((card) => this.getCardValue(card)).sort((a, b) => b - a);
        const counts = {};
        const suits = {};

        cards.forEach((card) => {
            const value = this.getCardValue(card);
            counts[value] = (counts[value] || 0) + 1;
            suits[card.suit] = (suits[card.suit] || 0) + 1;
        });

        const groups = Object.keys(counts)
            .map((value) => ({ value: parseInt(value, 10), count: counts[value] }))
            .sort((a, b) => b.count - a.count || b.value - a.value);

        let flushSuit = null;
        Object.keys(suits).forEach((suit) => {
            if (suits[suit] >= 5) flushSuit = suit;
        });

        if (flushSuit) {
            const flushValues = cards
                .filter((card) => card.suit === flushSuit)
                .map((card) => this.getCardValue(card));
            const straightFlushHigh = this.findStraightHigh(flushValues);
            if (straightFlushHigh) {
                return {
                    rank: 8,
                    label: straightFlushHigh === 14 ? 'Royal Flush' : 'Straight Flush',
                    values: [straightFlushHigh]
                };
            }
        }

        if (groups[0] && groups[0].count === 4) {
            const kicker = groups.filter((group) => group.value !== groups[0].value)[0];
            return { rank: 7, label: 'Four of a Kind', values: [groups[0].value, kicker ? kicker.value : 0] };
        }

        const tripleGroups = groups.filter((group) => group.count >= 3);
        const pairGroups = groups.filter((group) => group.count >= 2 && (!tripleGroups[0] || group.value !== tripleGroups[0].value));
        if (tripleGroups.length && (pairGroups.length || tripleGroups.length > 1)) {
            const topThree = tripleGroups[0].value;
            const topPair = pairGroups.length ? pairGroups[0].value : tripleGroups[1].value;
            return { rank: 6, label: 'Full House', values: [topThree, topPair] };
        }

        if (flushSuit) {
            const flushCards = cards
                .filter((card) => card.suit === flushSuit)
                .map((card) => this.getCardValue(card))
                .sort((a, b) => b - a)
                .slice(0, 5);
            return { rank: 5, label: 'Flush', values: flushCards };
        }

        const straightHigh = this.findStraightHigh(values);
        if (straightHigh) return { rank: 4, label: 'Straight', values: [straightHigh] };

        if (tripleGroups.length) {
            const kickers = groups.filter((group) => group.value !== tripleGroups[0].value).map((group) => group.value).slice(0, 2);
            return { rank: 3, label: 'Three of a Kind', values: [tripleGroups[0].value].concat(kickers) };
        }

        const actualPairs = groups.filter((group) => group.count >= 2);
        if (actualPairs.length >= 2) {
            const topPairs = actualPairs.slice(0, 2);
            const kicker = groups.filter((group) => group.value !== topPairs[0].value && group.value !== topPairs[1].value)[0];
            return { rank: 2, label: 'Two Pair', values: [topPairs[0].value, topPairs[1].value, kicker ? kicker.value : 0] };
        }

        if (actualPairs.length === 1) {
            const pairValue = actualPairs[0].value;
            const kickers = groups.filter((group) => group.value !== pairValue).map((group) => group.value).slice(0, 3);
            return { rank: 1, label: 'Pair', values: [pairValue].concat(kickers) };
        }

        return { rank: 0, label: 'High Card', values: values.slice(0, 5) };
    },
    renderCards(cards, options) {
        const settings = options || {};
        return cards.map((card, index) => {
            if (settings.hide && index < settings.hideCount) return '<div class="bj-card card-back">?</div>';
            const animate = settings.animateFrom !== undefined && index >= settings.animateFrom ? 'bj-anim' : '';
            const red = ['♥', '♦'].includes(card.suit) ? 'red' : '';
            return `<div class="bj-card poker-card ${red} ${animate}">${card.val}${card.suit}</div>`;
        }).join('');
    },
    render(showDealer) {
        $('th-player-hand').innerHTML = this.renderCards(this.playerHand, { animateFrom: Math.max(0, this.playerHand.length - this.lastRevealCount) });
        $('th-dealer-hand').innerHTML = this.renderCards(this.dealerHand, showDealer ? { animateFrom: Math.max(0, this.dealerHand.length - this.lastRevealCount) } : { hide: true, hideCount: this.dealerHand.length });
        $('th-board').innerHTML = this.renderCards(this.communityCards, { animateFrom: Math.max(0, this.communityCards.length - this.lastRevealCount) });
        $('th-street-label').innerText = this.getStreetLabel();

        const playerCards = this.playerHand.concat(this.communityCards);
        const playerBest = this.evaluateHand(playerCards);
        $('th-player-best').innerText = playerCards.length ? playerBest.label : 'No hand yet';
        $('th-dealer-best').innerText = showDealer ? this.evaluateHand(this.dealerHand.concat(this.communityCards)).label : 'Dealer hidden';
        this.lastRevealCount = 0;
    },
    reset() {
        this.open();
    }
};
