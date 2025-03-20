// Socket client handler
class SocketClient {
    constructor() {
        this.socket = null;
        this.callbacks = {
            'connect': [],
            'disconnect': [],
            'error': [],
            'gameState': [],
            'playerState': [],
            'playerJoined': [],
            'playerLeft': [],
            'playerReadyUpdate': [],
            'gameStarted': [],
            'yourTurnToCall': [],
            'selectTrump': [],
            'trumpSelected': [],
            'trickComplete': [],
            'roundComplete': [],
            'gameComplete': []
        };
        
        this.init();
    }
    
    init() {
        // Initialize socket connection
        this.socket = io();
        
        // Set up event listeners for all supported events
        Object.keys(this.callbacks).forEach(event => {
            this.socket.on(event, (data) => {
                this.callbacks[event].forEach(callback => callback(data));
            });
        });
        
        // Special handling for connection event
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
        });
        
        // Special handling for disconnection
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }
    
    // Register a callback for a specific event
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].push(callback);
        }
    }
    
    // Send an event to the server
    emit(event, data) {
        this.socket.emit(event, data);
    }
    
    // Join the game with a player name
    joinGame(playerName) {
        this.emit('joinGame', playerName);
    }
    
    // Set player as ready
    setReady() {
        this.emit('playerReady');
    }
    
    // Make a call
    makeCall(call) {
        this.emit('makeCall', call);
    }
    
    // Select trump suit
    selectTrump(suit) {
        this.emit('selectTrump', suit);
    }
    
    // Play a card
    playCard(card) {
        this.emit('playCard', card);
    }
    
    // Get the socket ID
    getId() {
        return this.socket.id;
    }
}

// Create a global socketClient instance
const socketClient = new SocketClient();

// If running in a browser environment
if (typeof window !== 'undefined') {
    window.socketClient = socketClient;
}

// If running in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketClient;
}
socket.on('disconnect', () => {
    console.log('Disconnected from server');
    showNotification('Connection lost. Attempting to reconnect...');
    
    // Store game state locally
    localStorage.setItem('gameState', JSON.stringify(gameState));
    localStorage.setItem('playerState', JSON.stringify(playerState));
    localStorage.setItem('playerId', playerId);
    localStorage.setItem('playerName', playerName);
  });
  
  socket.on('connect', () => {
    // Check if we're reconnecting
    const storedPlayerId = localStorage.getItem('playerId');
    const storedPlayerName = localStorage.getItem('playerName');
    
    if (storedPlayerId && storedPlayerName) {
      // Attempt to rejoin the game
      socket.emit('rejoinGame', {
        previousId: storedPlayerId,
        name: storedPlayerName
      });
      
      showNotification('Reconnected to game!');
    }
  });