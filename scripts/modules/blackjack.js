// Blackjack minigame
// Depends on: $ (constants.js), game (gladiator_game.js)

const blackjack = {
    deck: [], playerHand: [], dealerHand: [], bet: 0, active: false,
    updateBetUI() {
        const total = $('bj-bet-total');
        if (total) total.innerText = this.bet;
    },
    syncGoldUI() {
        const gold = $('bj-gold');
        if (gold && game.player) gold.innerText = game.player.gold;
    },
    resetState() {
        this.deck = [];
        this.playerHand = [];
        this.dealerHand = [];
        this.bet = 0;
        this.active = false;
    },
    showIdleTable() {
        $('bj-game').classList.remove('hidden');
        $('bj-betbar').classList.remove('hidden');
        $('bj-controls').classList.add('hidden');
        $('bj-reset').classList.add('hidden');
    },
    open() {
        this.resetState();
        $('bj-msg').innerText = 'Set your wager, then deal the hand.';
        $('player-hand').innerHTML = '';
        $('dealer-hand').innerHTML = '';
        $('player-score').innerText = '';
        $('dealer-score').innerText = '';
        this.showIdleTable();
        this.syncGoldUI();
        this.updateBetUI();
        const res = $('bj-result-overlay');
        if (res) {
            res.classList.add('hidden');
            res.classList.remove('visible');
        }
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
        const s=['♠','♥','♣','♦'], v=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        this.deck=[];
        s.forEach(st => v.forEach(vl => this.deck.push({suit:st, val:vl})));
        this.deck.sort(() => Math.random()-0.5);
    },
    getVal(c) {
        if(['J','Q','K'].includes(c.val)) return 10;
        if(c.val==='A') return 11;
        return parseInt(c.val);
    },
    calc(hand) {
        let sum=0, aces=0;
        hand.forEach(c => { sum+=this.getVal(c); if(c.val==='A') aces++; });
        while(sum>21 && aces>0) { sum-=10; aces--; }
        return sum;
    },
    deal() {
        const b = this.bet;
        if(isNaN(b) || b<=0 || b>game.player.gold) { alert("Invalid bet"); return; }
        this.bet = b;
        game.player.gold -= b;
        this.syncGoldUI();
        this.createDeck();
        this.playerHand=[this.deck.pop(), this.deck.pop()];
        this.dealerHand=[this.deck.pop(), this.deck.pop()];
        this.active = true;
        $('bj-game').classList.remove('hidden');
        $('bj-betbar').classList.add('hidden');
        $('bj-controls').classList.remove('hidden');
        $('bj-reset').classList.add('hidden');
        $('bj-msg').innerText="";
        this.render(false);
        if(this.calc(this.playerHand)===21) this.end();
    },
    hit() {
        if (!this.active) return;
        this.playerHand.push(this.deck.pop());
        this.render(false);
        if(this.calc(this.playerHand)>21) this.end();
    },
    stand() {
        if (!this.active) return;
        this.active = false;
        while (this.calc(this.dealerHand) < 17) this.dealerHand.push(this.deck.pop());
        this.end();
    },
    end() {
        this.active = false;
        this.render(true);
        $('bj-betbar').classList.add('hidden');
        $('bj-controls').classList.add('hidden');
        $('bj-reset').classList.remove('hidden');

        const p = this.calc(this.playerHand), d = this.calc(this.dealerHand);
        let win = false, push = false;
        if (p > 21) win = false;
        else if (d > 21) win = true;
        else if (p > d) win = true;
        else if (p === d) push = true;

        let text = "PUSH"; let color = "#ffffff";
        if (push) {
            game.player.gold += this.bet;
        } else if (win) {
            text = "YOU WIN"; color = "#00e676"; game.player.gold += (this.bet * 2);
        } else {
            text = "DEALER WINS"; color = "#ff1744";
        }

        const ov = $('bj-result-overlay');
        const lbl = $('bj-result-text');
        if (ov && lbl) {
            lbl.innerText = text;
            lbl.style.color = color;
            ov.classList.remove('hidden');
            ov.classList.remove('visible');
            setTimeout(() => { ov.classList.add('visible'); }, 700);
        }
        this.syncGoldUI();
        game.saveGame();
    },
    render(show) {
        const draw = (hand, hideFirst, animateLast) => hand.map((c,i) => {
            if(hideFirst && i===0) return `<div class="bj-card card-back">?</div>`;
            const anim = (animateLast && i === hand.length-1) ? 'bj-anim' : '';
            return `<div class="bj-card ${['♥','♦'].includes(c.suit)?'red':''} ${anim}">${c.val}${c.suit}</div>`;
        }).join('');
        const animatePlayer = this.playerHand.length > 2;
        const animateDealer = (!show && this.dealerHand.length > 2);
        $('player-hand').innerHTML = draw(this.playerHand, false, animatePlayer);
        $('player-score').innerText = this.calc(this.playerHand);
        $('dealer-hand').innerHTML = draw(this.dealerHand, !show, animateDealer);
        $('dealer-score').innerText = show ? this.calc(this.dealerHand) : "?";
    },
    reset() { this.open(); }
};
