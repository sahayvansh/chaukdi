const Player = require('./player');

class Game {
  constructor() {
    this.players = [];
    this.currentRound = 0;
    this.maxRounds = 12;
    this.deck = [];
    this.trumpSuit = null;
    this.currentTrick = [];
    this.currentPlayerIndex = 0;
    this.callsComplete = false;
    this.gameState = 'waiting'; // waiting, calling, playing, roundEnd, gameEnd
  }

  addPlayer(id, name) {
    if (this.players.length < 4 && this.gameState === 'waiting') {
      const player = new Player(id, name);
      this.players.push(player);
      return player;
    }
    return null;
  }

  removePlayer(id) {
    const index = this.players.findIndex(player => player.id === id);
    if (index !== -1) {
      this.players.splice(index, 1);
      
      // Reset game if a player leaves during play
      if (this.gameState !== 'waiting') {
        this.resetGame();
      }
      
      return true;
    }
    return false;
  }

  resetGame() {
    this.currentRound = 0;
    this.trumpSuit = null;
    this.currentTrick = [];
    this.currentPlayerIndex = 0;
    this.callsComplete = false;
    this.gameState = 'waiting';
    
    this.players.forEach(player => {
      player.score = 0;
      player.resetRound();
    });
  }

  createDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'jack', 'queen', 'king', 'ace'];
    
    this.deck = [];
    
    for (const suit of suits) {
      for (const value of values) {
        this.deck.push({
          suit,
          value,
          // For image filenames
          imageName: typeof value === 'number' ? 
            `${value}_of_${suit}.png` : 
            `${value}_of_${suit}.png`
        });
      }
    }
  }

  shuffleDeck() {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  dealCards() {
    this.createDeck();
    this.shuffleDeck();
    
    // Clear players' hands
    this.players.forEach(player => {
      player.cards = [];
    });
    
    // Deal 13 cards to each player
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < this.players.length; j++) {
        if (this.deck.length > 0) {
          this.players[j].addCard(this.deck.pop());
        }
      }
    }
  }

  startGame() {
    if (this.players.length === 4) {
      this.gameState = 'calling';
      this.currentRound = 1;
      this.dealCards();
      return true;
    }
    return false;
  }

  makeCall(playerId, call) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1 || this.gameState !== 'calling') {
      return false;
    }
    
    // Check if it's this player's turn to call
    if (playerIndex !== this.currentPlayerIndex) {
      return false;
    }
    
    this.players[playerIndex].setCall(call);
    
    // Move to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
    // Check if all players have made their calls
    const allPlayersCalled = this.players.every(player => player.call > 0);
    
    if (allPlayersCalled) {
      // Check if sum of calls is exactly 13
      const sumOfCalls = this.players.reduce((sum, player) => sum + player.call, 0);
      
      if (sumOfCalls === 13) {
        // Invalid state, reset calls
        this.players.forEach(player => player.call = 0);
        this.currentPlayerIndex = 0;
        return { success: false, message: "Sum of calls cannot be exactly 13" };
      }
      
      this.callsComplete = true;
      
      // Find player with highest call
      let highestCallPlayer = this.players[0];
      for (let i = 1; i < this.players.length; i++) {
        if (this.players[i].call > highestCallPlayer.call) {
          highestCallPlayer = this.players[i];
        }
      }
      
      // Set current player to the one with highest call (for trump selection)
      this.currentPlayerIndex = this.players.findIndex(p => p.id === highestCallPlayer.id);
      
      return { 
        success: true, 
        callsComplete: true, 
        highestCallPlayerId: highestCallPlayer.id 
      };
    }
    
    return { success: true, callsComplete: false };
  }

  setTrump(playerId, suit) {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1 || !this.callsComplete || this.gameState !== 'calling') {
      return false;
    }
    
    // Check if it's the highest caller's turn
    if (playerIndex !== this.currentPlayerIndex) {
      return false;
    }
    
    this.trumpSuit = suit;
    this.gameState = 'playing';
    
    // First player to play is the one who chose trump
    return true;
  }

  playCard(playerId, card) {
    if (this.gameState !== 'playing') {
        return { success: false, message: "Game is not in playing state" };
    }
    
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
        return { success: false, message: "Player not found" };
    }
    
    if (playerIndex !== this.currentPlayerIndex) {
        return { success: false, message: "Not your turn" };
    }
    
    const player = this.players[playerIndex];
    
    // Check if this is the first card of the trick
    const isFirstCard = this.currentTrick.length === 0;
    
    // If not first card, check if player must follow suit
    if (!isFirstCard) {
        const leadSuit = this.currentTrick[0].card.suit;
        const hasLeadSuit = player.cards.some(c => c.suit === leadSuit);
        
        // If player has the lead suit but played a different suit
        if (hasLeadSuit && card.suit !== leadSuit) {
            return { 
                success: false, 
                message: "You must follow suit if possible" 
            };
        }
    }
    
    const playedCard = player.removeCard(card);
    
    if (!playedCard) {
        return { success: false, message: "Card not in player's hand" };
    }
    
    // Add card to current trick with player info
    this.currentTrick.push({
        card: playedCard,
        playerId: playerId,
        playerIndex: playerIndex
    });
    
    // Move to next player
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    
    // Check if trick is complete (all 4 players played)
    if (this.currentTrick.length === 4) {
        const trickWinner = this.determineTrickWinner();
        this.players[trickWinner.playerIndex].incrementTricks();
        
        // Next player is the trick winner
        this.currentPlayerIndex = trickWinner.playerIndex;
        
        // Clear current trick
        this.currentTrick = [];
        
        // Check if round is complete (13 tricks played)
        const roundComplete = this.players.reduce((sum, player) => sum + player.tricks, 0) === 13;
        
        if (roundComplete) {
            this.endRound();
        }
        
        return { 
            success: true, 
            trickComplete: true, 
            trickWinner: trickWinner.playerId,
            roundComplete: roundComplete
        };
    }
    
    return { success: true, trickComplete: false };
}


determineTrickWinner() {
  if (this.currentTrick.length !== 4) {
      return null;
  }
  
  // Get the suit of the first card played (leading suit)
  const leadingSuit = this.currentTrick[0].card.suit;
  
  let winningCard = this.currentTrick[0];
  
  for (let i = 1; i < this.currentTrick.length; i++) {
      const currentCard = this.currentTrick[i];
      
      // If current card is trump and winning card is not
      if (currentCard.card.suit === this.trumpSuit && winningCard.card.suit !== this.trumpSuit) {
          winningCard = currentCard;
      }
      // If both are trump, compare values
      else if (currentCard.card.suit === this.trumpSuit && winningCard.card.suit === this.trumpSuit) {
          if (this.getCardValue(currentCard.card.value) > this.getCardValue(winningCard.card.value)) {
              winningCard = currentCard;
          }
      }
      // If current card matches leading suit and winning card is not trump
      else if (currentCard.card.suit === leadingSuit && winningCard.card.suit !== this.trumpSuit) {
          if (this.getCardValue(currentCard.card.value) > this.getCardValue(winningCard.card.value)) {
              winningCard = currentCard;
          }
      }
  }
  
  return winningCard;
}


  getCardValue(value) {
    if (typeof value === 'number') {
      return value;
    }
    
    switch (value) {
      case 'jack': return 11;
      case 'queen': return 12;
      case 'king': return 13;
      case 'ace': return 14;
      default: return 0;
    }
  }

  endRound() {
    // Calculate scores for all players
    this.players.forEach(player => {
      player.updateScore();
    });
    
    this.currentRound++;
    
    if (this.currentRound > this.maxRounds) {
      this.gameState = 'gameEnd';
    } else {
      this.gameState = 'roundEnd';
      
      // Reset for next round
      this.trumpSuit = null;
      this.callsComplete = false;
      this.players.forEach(player => player.resetRound());
      
      // Deal new cards
      this.dealCards();
      
      // Start with player 0 for the next round
      this.currentPlayerIndex = 0;
      this.gameState = 'calling';
    }
  }

  getGameState() {
    return {
      players: this.players.map(player => ({
        id: player.id,
        name: player.name,
        call: player.call,
        tricks: player.tricks,
        score: player.score,
        cardsCount: player.cards.length
      })),
      currentRound: this.currentRound,
      maxRounds: this.maxRounds,
      trumpSuit: this.trumpSuit,
      currentTrick: this.currentTrick,
      currentPlayerIndex: this.currentPlayerIndex,
      gameState: this.gameState,
      callsComplete: this.callsComplete
    };
  }

  getPlayerState(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;
    
    return {
      ...this.getGameState(),
      cards: player.cards
    };
  }
}

module.exports = Game;
