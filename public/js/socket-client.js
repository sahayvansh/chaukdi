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
            'gameComplete': [],
            'rejoinFailed': [],
            'playerRejoined': []
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
            
            // Check if we're reconnecting
            const storedPlayerId = localStorage.getItem('playerId');
            const storedPlayerName = localStorage.getItem('playerName');
            
            if (storedPlayerId && storedPlayerName) {
                // Attempt to rejoin the game
                this.emit('rejoinGame', {
                    previousId: storedPlayerId,
                    name: storedPlayerName
                });
                
                console.log('Attempting to rejoin game as', storedPlayerName);
            }
        });
        
        // Special handling for disconnection
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            
            // Store game state locally if available
            if (window.gameState) {
                localStorage.setItem('gameState', JSON.stringify(window.gameState));
            }
            
            if (window.playerState) {
                localStorage.setItem('playerState', JSON.stringify(window.playerState));
            }
            
            if (window.playerId) {
                localStorage.setItem('playerId', window.playerId);
            }
            
            if (window.playerName) {
                localStorage.setItem('playerName', window.playerName);
            }
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
    
    // Attempt to rejoin a game
    rejoinGame(previousId, name) {
        this.emit('rejoinGame', { previousId, name });
    }
    
    // Get the socket ID
    getId() {
        return this.socket.id;
    }
    
    // Check if socket is connected
    isConnected() {
        return this.socket.connected;
    }
    
    // Reconnect if disconnected
    reconnect() {
        if (!this.socket.connected) {
            this.socket.connect();
        }
    }
}

// Create a global socketClient instance
const socketClient = new SocketClient();

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // Save game state when page becomes hidden
        if (window.gameState) {
            localStorage.setItem('gameState', JSON.stringify(window.gameState));
        }
        
        if (window.playerState) {
            localStorage.setItem('playerState', JSON.stringify(window.playerState));
        }
        
        if (window.playerId) {
            localStorage.setItem('playerId', window.playerId);
        }
        
        if (window.playerName) {
            localStorage.setItem('playerName', window.playerName);
        }
    } else if (document.visibilityState === 'visible') {
        // Check if we need to reconnect
        if (socketClient && !socketClient.isConnected()) {
            socketClient.reconnect();
        }
    }
});

// If running in a browser environment
if (typeof window !== 'undefined') {
    window.socketClient = socketClient;
}

// If running in Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocketClient;
}
