// Gamble modal controller
// Depends on: blackjack, texasHoldem, game

const gamble = {
    currentGame: 'blackjack',
    inLobby: true,
    getController(gameKey) {
        return gameKey === 'holdem' ? texasHoldem : blackjack;
    },
    updateTabs() {
        const blackjackTab = $('gamble-tab-blackjack');
        const holdemTab = $('gamble-tab-holdem');
        const isBlackjack = this.currentGame === 'blackjack';

        if (blackjackTab) blackjackTab.classList.toggle('active', isBlackjack);
        if (holdemTab) holdemTab.classList.toggle('active', !isBlackjack);
    },
    updateView() {
        const lobby = $('gamble-lobby');
        const blackjackPanel = $('gamble-panel-blackjack');
        const holdemPanel = $('gamble-panel-holdem');
        const isBlackjack = this.currentGame === 'blackjack';

        if (lobby) lobby.classList.toggle('hidden', !this.inLobby);
        if (blackjackPanel) blackjackPanel.classList.toggle('hidden', this.inLobby || !isBlackjack);
        if (holdemPanel) holdemPanel.classList.toggle('hidden', this.inLobby || isBlackjack);
    },
    open(gameKey) {
        this.currentGame = gameKey || 'blackjack';
        this.inLobby = true;
        $('modal-gamble').classList.remove('hidden');
        this.updateTabs();
        this.updateView();
    },
    switchGame(gameKey) {
        this.currentGame = gameKey;
        this.updateTabs();
    },
    startSelectedGame() {
        this.inLobby = false;
        this.updateView();
        this.getController(this.currentGame).open();
    },
    backToLobby() {
        const currentController = this.getController(this.currentGame);
        if (currentController && currentController.active) {
            alert('Finish the current hand before returning to the hall.');
            return;
        }
        this.inLobby = true;
        this.updateTabs();
        this.updateView();
    },
    close() {
        const currentController = this.inLobby ? null : this.getController(this.currentGame);
        if (currentController && currentController.active) {
            alert('Finish the current hand before leaving the table.');
            return;
        }
        this.inLobby = true;
        $('modal-gamble').classList.add('hidden');
        game.updateHubUI();
    }
};
