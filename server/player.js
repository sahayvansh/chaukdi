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
      this.cards.push(card);
    }
  
    removeCard(card) {
      const index = this.cards.findIndex(c => 
        c.value === card.value && c.suit === card.suit);
      
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
  }
  
  module.exports = Player;
  