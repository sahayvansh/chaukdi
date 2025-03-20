// Global variables
let socket;
let playerId;
let playerName;
let gameState;
let playerState;
let currentPlayerTurn = false;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const waitingRoom = document.getElementById('waiting-room');
const gameBoard = document.getElementById('game-board');
const playerNameInput = document.getElementById('player-name');
const joinBtn = document.getElementById('join-btn');
const readyBtn = document.getElementById('ready-btn');
const playersList = document.getElementById('players-list');
const callDialog = document.getElementById('call-dialog');
const trumpDialog = document.getElementById('trump-dialog');
const roundEndDialog = document.getElementById('round-end-dialog');
const gameEndDialog = document.getElementById('game-end-dialog');
const notificationArea = document.getElementById('notification-area');
const playerCards = document.getElementById('player-cards');
const playedCards = document.getElementById('played-cards');
const currentRoundSpan = document.getElementById('current-round');
const trumpSuitSpan = document.getElementById('trump-suit');

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    // Connect to Socket.IO server
    socket = io();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up socket event handlers
    setupSocketHandlers();
});

// Set up event listeners for UI elements
function setupEventListeners() {
    // Join button click
    joinBtn.addEventListener('click', () => {
        playerName = playerNameInput.value.trim();        
        if (!playerName) {
          showNotification('Please enter a name');
          return;
        }
        
        socket.emit('joinGame', playerName);
      });
    
    // Ready button click
    readyBtn.addEventListener('click', () => {
        socket.emit('playerReady');
        readyBtn.disabled = true;
        showNotification('You are ready!');
    });
    
    // Call buttons click
    document.querySelectorAll('.call-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const call = parseInt(btn.getAttribute('data-call'));
            socket.emit('makeCall', call);
            callDialog.classList.add('hidden');
            showNotification(`You called ${call}`);
        });
    });
    
    // Trump buttons click
    document.querySelectorAll('.trump-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const suit = btn.getAttribute('data-suit');
            socket.emit('selectTrump', suit);
            trumpDialog.classList.add('hidden');
            showNotification(`You selected ${suit} as trump`);
        });
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // Save game state when page becomes hidden
          localStorage.setItem('gameState', JSON.stringify(gameState));
          localStorage.setItem('playerState', JSON.stringify(playerState));
          localStorage.setItem('playerId', playerId);
          localStorage.setItem('playerName', playerName);
        } else if (document.visibilityState === 'visible') {
          // Check if we need to reconnect
          if (socket.disconnected) {
            socket.connect();
          }
        }
      });
    // Next round button click
    document.getElementById('next-round-btn').addEventListener('click', () => {
        roundEndDialog.classList.add('hidden');
    });
    
    // New game button click
    document.getElementById('new-game-btn').addEventListener('click', () => {
        window.location.reload();
    });
}

// Set up Socket.IO event handlers
function setupSocketHandlers() {
    // Connection established
    socket.on('connect', () => {
        playerId = socket.id;
        console.log('Connected to server with ID:', playerId);
    });
    
    // Error handling
    socket.on('error', (data) => {
        showNotification(data.message);
    });
    
    // Player joined
    socket.on('playerJoined', (data) => {
        showNotification(`${data.name} joined the game`);
        updatePlayersList();
    });
    
    // Player left
    socket.on('playerLeft', (data) => {
        showNotification('A player left the game');
        updatePlayersList();
    });
    
    // Player ready update
    socket.on('playerReadyUpdate', (data) => {
        updatePlayersList();
    });
    
    // Game state update
    socket.on('gameState', (state) => {
        gameState = state;
        updateGameUI();
    });
    
    // Player state update (private)
    socket.on('playerState', (state) => {
        playerState = state;
        updatePlayerCards();
    });
    
    // Game started
    socket.on('gameStarted', (state) => {
        gameState = state;
        showGameBoard();
        showNotification('Game started!');
    });
    
    // Your turn to call
    socket.on('yourTurnToCall', () => {
        callDialog.classList.remove('hidden');
    });
    
    // Select trump
    socket.on('selectTrump', () => {
        trumpDialog.classList.remove('hidden');
    });
    
    // Trump selected
    socket.on('trumpSelected', (suit) => {
        trumpSuitSpan.textContent = capitalizeFirstLetter(suit);
        showNotification(`Trump is ${suit}`);
    });
    
    // Trick complete
    socket.on('trickComplete', (data) => {
        const winnerName = getPlayerNameById(data.winnerId);
        showNotification(`${winnerName} won the trick!`);
        
        // Clear played cards after a delay
        setTimeout(() => {
            playedCards.innerHTML = '';
        }, 2000);
    });
    
    // Round complete
    socket.on('roundComplete', (data) => {
        document.getElementById('round-number').textContent = data.roundNumber;
        
        const roundScoresDiv = document.getElementById('round-scores');
        roundScoresDiv.innerHTML = '';
        
        // Sort scores from highest to lowest
        const sortedScores = [...data.scores].sort((a, b) => b.score - a.score);
        
        sortedScores.forEach(player => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            if (player.id === sortedScores[0].id) {
                scoreItem.classList.add('winner');
            }
            scoreItem.textContent = `${player.name}: ${player.score}`;
            roundScoresDiv.appendChild(scoreItem);
        });
        
        roundEndDialog.classList.remove('hidden');
    });
    
    // Game complete
    socket.on('gameComplete', (data) => {
        const finalScoresDiv = document.getElementById('final-scores');
        finalScoresDiv.innerHTML = '';
        
        data.scores.forEach((player, index) => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'score-item';
            if (index === 0) {
                scoreItem.classList.add('winner');
            }
            scoreItem.textContent = `${index + 1}. ${player.name}: ${player.score}`;
            finalScoresDiv.appendChild(scoreItem);
        });
        
        gameEndDialog.classList.remove('hidden');
    });
}

// Update the players list in the waiting room
function updatePlayersList() {
    if (!gameState) return;
    
    playersList.innerHTML = '';
    
    gameState.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        const playerNameSpan = document.createElement('span');
        playerNameSpan.textContent = player.name;
        
        const playerStatusSpan = document.createElement('span');
        playerStatusSpan.className = 'player-status';
        playerStatusSpan.classList.add(player.ready ? 'status-ready' : 'status-waiting');
        playerStatusSpan.textContent = player.ready ? 'Ready' : 'Waiting';
        
        playerItem.appendChild(playerNameSpan);
        playerItem.appendChild(playerStatusSpan);
        playersList.appendChild(playerItem);
    });
    
    // Show ready button if there are 4 players and the current player isn't ready
    if (gameState.players.length === 4) {
        const currentPlayer = gameState.players.find(p => p.id === playerId);
        if (currentPlayer && !currentPlayer.ready) {
            readyBtn.classList.remove('hidden');
        }
    }
    
    // Show waiting room if not already visible
    loginScreen.classList.add('hidden');
    waitingRoom.classList.remove('hidden');
}

// Show the game board
function showGameBoard() {
    waitingRoom.classList.add('hidden');
    gameBoard.classList.remove('hidden');
    updateGameUI();
}

// Update the game UI based on current game state
function updateGameUI() {
    if (!gameState) return;
    
    // Update round info
    currentRoundSpan.textContent = gameState.currentRound;
    
    // Update trump info
    trumpSuitSpan.textContent = gameState.trumpSuit ? 
        capitalizeFirstLetter(gameState.trumpSuit) : 'Not Selected';
    
    // Update trump indicator
    updateTrumpIndicator();

    // Update scoreboard
    updateScoreboard();
    
    // Update player positions
    updatePlayerPositions();
    
    // Update current trick
    updatePlayedCards();
    
    // Check if it's current player's turn
    checkPlayerTurn();
}
// Update the trump indicator
function updateTrumpIndicator() {
    const trumpIndicator = document.getElementById('trump-indicator');
    
    if (!gameState || !gameState.trumpSuit) {
        trumpIndicator.style.display = 'none';
        return;
    }
    
    trumpIndicator.style.display = 'flex';
    
    // Set the appropriate symbol based on the trump suit
    let symbol = '';
    let color = '';
    
    switch(gameState.trumpSuit) {
        case 'hearts':
            symbol = '♥';
            color = 'red';
            break;
        case 'diamonds':
            symbol = '♦';
            color = 'red';
            break;
        case 'clubs':
            symbol = '♣';
            color = 'black';
            break;
        case 'spades':
            symbol = '♠';
            color = 'black';
            break;
    }
    
    trumpIndicator.innerHTML = symbol;
    trumpIndicator.style.color = color;
}

// Update player positions around the table
function updatePlayerPositions() {
    if (!gameState || gameState.players.length !== 4) return;
    
    // Find current player's index
    const currentPlayerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (currentPlayerIndex === -1) return;
    
    // Assign positions based on relative position to current player
    const positions = ['top', 'right', 'bottom', 'left'];
    const playerPositions = {};
    
    for (let i = 0; i < gameState.players.length; i++) {
        // Calculate relative position
        const relativePos = (i - currentPlayerIndex + 4) % 4;
        const position = positions[relativePos];
        
        if (position !== 'bottom') { // 'bottom' is current player
            const player = gameState.players[i];
            playerPositions[position] = player;
        }
    }
    
    // Update UI for each position
    updateOpponentUI('top', playerPositions.top);
    updateOpponentUI('left', playerPositions.left);
    updateOpponentUI('right', playerPositions.right);
    
    // Update current player's info
    const currentPlayer = gameState.players[currentPlayerIndex];
    document.querySelector('#player-area .player-name').textContent = currentPlayer.name;
    document.querySelector('#player-area .call-value').textContent = 
        currentPlayer.call > 0 ? currentPlayer.call : '-';
    document.querySelector('#player-area .tricks-value').textContent = currentPlayer.tricks;
    document.querySelector('#player-area .score-value').textContent = currentPlayer.score;
}

// Update opponent UI at a specific position
function updateOpponentUI(position, player) {
    if (!player) return;
    
    const playerSpot = document.getElementById(`player-${position}`);
    playerSpot.querySelector('.player-name').textContent = player.name;
    playerSpot.querySelector('.call-value').textContent = 
        player.call > 0 ? player.call : '-';
    playerSpot.querySelector('.tricks-value').textContent = player.tricks;
    playerSpot.querySelector('.score-value').textContent = player.score;
    
    // Update opponent's cards (show card backs)
    const cardsContainer = playerSpot.querySelector('.player-cards');
    cardsContainer.innerHTML = '';
    
    for (let i = 0; i < player.cardsCount; i++) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card card-back';
        cardsContainer.appendChild(cardElement);
    }
}

// Update the current player's cards
function updatePlayerCards() {
    if (!playerState || !playerState.cards) return;
    
    playerCards.innerHTML = '';
    
    playerState.cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
        cardElement.setAttribute('data-suit', card.suit);
        cardElement.setAttribute('data-value', card.value);
        
        const cardImage = document.createElement('img');
        cardImage.src = `assets/images/cards/${card.imageName}`;
        cardImage.alt = `${card.value} of ${card.suit}`;
        
        cardElement.appendChild(cardImage);
        
        // Add click event for playing a card
        cardElement.addEventListener('click', () => {
            if (currentPlayerTurn && gameState.gameState === 'playing') {
                socket.emit('playCard', card);
            }
        });
        
        playerCards.appendChild(cardElement);
    });
}

// Update played cards on the table
function updatePlayedCards() {
    if (!gameState || !gameState.currentTrick) return;
    
    playedCards.innerHTML = '';
    
    gameState.currentTrick.forEach(played => {
        const cardElement = document.createElement('div');
        cardElement.className = 'played-card';
        
        const card = document.createElement('div');
        card.className = 'card';
        
        const cardImage = document.createElement('img');
        cardImage.src = `assets/images/cards/${played.card.imageName}`;
        cardImage.alt = `${played.card.value} of ${played.card.suit}`;
        
        card.appendChild(cardImage);
        cardElement.appendChild(card);
        playedCards.appendChild(cardElement);
    });
}

// Check if it's the current player's turn
function checkPlayerTurn() {
    if (!gameState) return;
    
    currentPlayerTurn = gameState.gameState === 'playing' && 
                       gameState.players[gameState.currentPlayerIndex]?.id === playerId;
    
    // Visual indication for player's turn
    if (currentPlayerTurn) {
        document.getElementById('player-area').classList.add('active-turn');
        showNotification('Your turn!');
    } else {
        document.getElementById('player-area').classList.remove('active-turn');
    }
    
    // Check if it's player's turn to call
    if (gameState.gameState === 'calling' && 
        gameState.players[gameState.currentPlayerIndex]?.id === playerId &&
        !gameState.callsComplete) {
        callDialog.classList.remove('hidden');
    }
}

// Helper function to get player name by ID
function getPlayerNameById(id) {
    if (!gameState) return 'Unknown';
    
    const player = gameState.players.find(p => p.id === id);
    return player ? player.name : 'Unknown';
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Show a notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    notificationArea.appendChild(notification);
    
    // Remove notification after 4 seconds
    setTimeout(() => {
        notification.remove();
    }, 4000);
}
function updateScoreboard() {
    if (!gameState) return;
    
    const scoreboard = document.getElementById('scoreboard-content');
    scoreboard.innerHTML = '';
    
    gameState.players.forEach(player => {
        const row = document.createElement('div');
        row.className = 'scoreboard-row';
        
        // Get first initial of player name
        const initial = player.name.charAt(0);
        
        row.innerHTML = `
            <span>${initial}. ${player.name.substring(0, 6)}</span>
            <span>${player.call > 0 ? player.call : '-'}</span>
            <span>${player.tricks}</span>
            <span>${player.score}</span>
        `;
        
        scoreboard.appendChild(row);
    });
}