const Game = require('./game');

let game = new Game();

function initializeSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Handle player joining
    socket.on('joinGame', (playerName) => {
      const player = game.addPlayer(socket.id, playerName);
      
      if (player) {
        socket.join('game-room');
        
        // Send game state to all players
        io.to('game-room').emit('gameState', game.getGameState());
        
        // Send private state to this player
        socket.emit('playerState', game.getPlayerState(socket.id));
        
        // Notify all players of new player
        io.to('game-room').emit('playerJoined', {
          id: player.id,
          name: player.name
        });
      } else {
        socket.emit('error', { message: 'Game is full or already started' });
      }
    });

    // Handle player ready state
    socket.on('playerReady', () => {
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        game.players[playerIndex].ready = true;
        
        // Check if all players are ready
        const allReady = game.players.length === 4 && 
                         game.players.every(p => p.ready);
        
        if (allReady) {
          game.startGame();
          io.to('game-room').emit('gameStarted', game.getGameState());
          
          // Send private state to each player
          game.players.forEach(player => {
            io.to(player.id).emit('playerState', game.getPlayerState(player.id));
          });
        } else {
          io.to('game-room').emit('playerReadyUpdate', {
            playerId: socket.id,
            ready: true
          });
        }
      }
    });

    // Handle player making a call
    socket.on('makeCall', (call) => {
      const result = game.makeCall(socket.id, call);
      
      if (result && result.success) {
        // Send updated game state to all players
        io.to('game-room').emit('gameState', game.getGameState());
        
        // If calls are complete, notify the player who needs to select trump
        if (result.callsComplete) {
          io.to(result.highestCallPlayerId).emit('selectTrump');
        }
      } else if (result) {
        // Send error to the player
        socket.emit('error', { message: result.message });
      }
    });

    // Handle player selecting trump
    socket.on('selectTrump', (suit) => {
      const result = game.setTrump(socket.id, suit);
      
      if (result) {
        // Send updated game state to all players
        io.to('game-room').emit('gameState', game.getGameState());
        io.to('game-room').emit('trumpSelected', suit);
        
        // Send private state to each player
        game.players.forEach(player => {
          io.to(player.id).emit('playerState', game.getPlayerState(player.id));
        });
      } else {
        socket.emit('error', { message: 'Unable to select trump' });
      }
    });

    // Handle player playing a card
    socket.on('playCard', (card) => {
      const result = game.playCard(socket.id, card);
      
      if (result && result.success) {
        // Send updated game state to all players
        io.to('game-room').emit('gameState', game.getGameState());
        
        // Send private state to each player
        game.players.forEach(player => {
          io.to(player.id).emit('playerState', game.getPlayerState(player.id));
        });
        
        // Notify about trick completion
        if (result.trickComplete) {
          io.to('game-room').emit('trickComplete', {
            winnerId: result.trickWinner
          });
          
          // Notify about round completion
          if (result.roundComplete) {
            io.to('game-room').emit('roundComplete', {
              roundNumber: game.currentRound,
              scores: game.players.map(p => ({
                id: p.id,
                name: p.name,
                score: p.score
              }))
            });
            
            // Check if game is complete
            if (game.gameState === 'gameEnd') {
              io.to('game-room').emit('gameComplete', {
                scores: game.players.map(p => ({
                  id: p.id,
                  name: p.name,
                  score: p.score
                })).sort((a, b) => b.score - a.score)
              });
            }
          }
        }
      } else if (result) {
        socket.emit('error', { message: result.message });
      }
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${socket.id}`);
      const removed = game.removePlayer(socket.id);
      
      if (removed) {
        io.to('game-room').emit('playerLeft', {
          id: socket.id
        });
        
        // Send updated game state
        io.to('game-room').emit('gameState', game.getGameState());
      }
    });
  });
}

module.exports = { initializeSocketHandlers };
