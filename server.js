const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Start HTTP server
const server = app.listen(port, () => {
    console.log(`HTTP server is running on port ${port}`);
});

// Create WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ server });

// Store active games
const games = new Map();

wss.on('connection', (ws) => {
    let playerGame = null;
    let playerId = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                // Handle player joining a game
                const code = data.code.toUpperCase();
                
                if (!games.has(code)) {
                    // Create new game if code doesn't exist
                    games.set(code, {
                        host: ws,
                        hostId: Math.random().toString(),
                        guest: null,
                        guestId: null
                    });
                    playerGame = code;
                    playerId = games.get(code).hostId;
                    ws.send(JSON.stringify({
                        type: 'join',
                        success: true,
                        isHost: true,
                        playerId: playerId
                    }));
                } else if (!games.get(code).guest) {
                    // Join existing game if there's space
                    const game = games.get(code);
                    game.guest = ws;
                    game.guestId = Math.random().toString();
                    playerGame = code;
                    playerId = game.guestId;
                    
                    // Notify both players
                    ws.send(JSON.stringify({
                        type: 'join',
                        success: true,
                        isHost: false,
                        playerId: playerId
                    }));
                    
                    // Send ready state to both players
                    game.host.send(JSON.stringify({
                        type: 'readyState',
                        bothPlayersReady: true
                    }));
                    game.guest.send(JSON.stringify({
                        type: 'readyState',
                        bothPlayersReady: true
                    }));
                }
                break;

            case 'playerUpdate':
            case 'platformUpdate':
            case 'ropeUpdate':
                // Forward updates to other player if in a game
                if (playerGame && games.has(playerGame)) {
                    const game = games.get(playerGame);
                    const otherPlayer = ws === game.host ? game.guest : game.host;
                    if (otherPlayer) {
                        otherPlayer.send(message.toString());
                    }
                }
                break;
        }
    });

    ws.on('close', () => {
        // Clean up when a player disconnects
        if (playerGame && games.has(playerGame)) {
            const game = games.get(playerGame);
            const otherPlayer = ws === game.host ? game.guest : game.host;
            
            if (otherPlayer) {
                otherPlayer.send(JSON.stringify({
                    type: 'playerDisconnect'
                }));
            }
            
            games.delete(playerGame);
        }
    });
}); 