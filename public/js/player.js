class Player {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.cards = [];
        this.call = 0;
        this.tricks = 0;
        this.score = 0;
        this.ready = false;
    }

    setCall(call) {
        this.call = call;
    }

    addCard(card) {
        // If card is not already a Card instance, create one
        if (!(card instanceof Card)) {
            card = new Card(card.suit, card.value, card.imageName);
        }
        this.cards.push(card);
    }

    removeCard(card) {
        const index = this.cards.findIndex(c => 
            c.suit === card.suit && c.value === card.value);
        
        if (index !== -1) {
            return this.cards.splice(index, 1)[0];
        }
        return null;
    }

    incrementTricks() {
        this.tricks += 1;
    }

    resetRound() {
        this.cards = [];
        this.call = 0;
        this.tricks = 0;
        this.ready = false;
    }

    calculateRoundScore() {
        if (this.tricks === this.call) {
            // Player made exactly what they called
            if (this.call > 10) {
                return 100 + this.call;
            } else {
                return 10 + this.call;
            }
        } else {
            // Player didn't make what they called
            return this.tricks;
        }
    }

    updateScore() {
        this.score += this.calculateRoundScore();
    }

    // Sort cards by suit and value
    sortCards() {
        const suitOrder = { 'spades': 0, 'hearts': 1, 'diamonds': 2, 'clubs': 3 };
        
        this.cards.sort((a, b) => {
            // First sort by suit
            if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                return suitOrder[a.suit] - suitOrder[b.suit];
            }
            
            // Then sort by value (high to low)
            return b.getValueRank() - a.getValueRank();
        });
    }

    // Check if player has a card of a specific suit
    hasSuit(suit) {
        return this.cards.some(card => card.suit === suit);
    }

    // Get valid cards to play based on lead suit and game rules
    getValidCards(leadSuit) {
        // If no lead suit or player doesn't have lead suit, all cards are valid
        if (!leadSuit || !this.hasSuit(leadSuit)) {
            return this.cards;
        }
        
        // Otherwise, only cards of lead suit are valid
        return this.cards.filter(card => card.suit === leadSuit);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            call: this.call,
            tricks: this.tricks,
            score: this.score,
            cardsCount: this.cards.length
        };
    }
}

// If running in a browser environment
if (typeof window !== 'undefined') {
    window.Player = Player;
}

// If running in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Player;
}
