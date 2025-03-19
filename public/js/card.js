class Card {
    constructor(suit, value, imageName) {
        this.suit = suit;
        this.value = value;
        this.imageName = imageName || this.generateImageName();
    }

    generateImageName() {
        // For number cards
        if (typeof this.value === 'number') {
            return `${this.value}_of_${this.suit}.png`;
        }
        // For face cards
        return `${this.value}_of_${this.suit}.png`;
    }

    getValueRank() {
        if (typeof this.value === 'number') {
            return this.value;
        }
        
        switch (this.value) {
            case 'jack': return 11;
            case 'queen': return 12;
            case 'king': return 13;
            case 'ace': return 14;
            default: return 0;
        }
    }

    isTrump(trumpSuit) {
        return this.suit === trumpSuit;
    }

    isHigherThan(otherCard, leadSuit, trumpSuit) {
        // If this card is trump and other is not
        if (this.isTrump(trumpSuit) && !otherCard.isTrump(trumpSuit)) {
            return true;
        }
        
        // If other card is trump and this is not
        if (!this.isTrump(trumpSuit) && otherCard.isTrump(trumpSuit)) {
            return false;
        }
        
        // If both are trump
        if (this.isTrump(trumpSuit) && otherCard.isTrump(trumpSuit)) {
            return this.getValueRank() > otherCard.getValueRank();
        }
        
        // If this card follows lead suit and other doesn't
        if (this.suit === leadSuit && otherCard.suit !== leadSuit) {
            return true;
        }
        
        // If other card follows lead suit and this doesn't
        if (this.suit !== leadSuit && otherCard.suit === leadSuit) {
            return false;
        }
        
        // If both follow lead suit or both don't follow lead suit
        return this.getValueRank() > otherCard.getValueRank();
    }

    toJSON() {
        return {
            suit: this.suit,
            value: this.value,
            imageName: this.imageName
        };
    }
}

// If running in a browser environment
if (typeof window !== 'undefined') {
    window.Card = Card;
}

// If running in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Card;
}
