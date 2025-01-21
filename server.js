const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 3000 });

// Store active rooms and their players
const rooms = new Map();

server.on('connection', (ws) => {
    let playerRoom = null;
    let playerId = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'join':
                // Check if room exists
                if (rooms.has(data.code)) {
                    // Join existing room if it has only one player
                    const room = rooms.get(data.code);
                    if (room.players.length < 2) {
                        playerId = 'player2';
                        playerRoom = data.code;
                        room.players.push({ ws, id: playerId });
                        
                        // Notify both players about successful join
                        room.players.forEach(player => {
                            player.ws.send(JSON.stringify({
                                type: 'join',
                                success: true,
                                isHost: player.id === 'player1',
                                playerId: player.id
                            }));
                        });
                    }
                } else {
                    // Create new room
                    playerId = 'player1';
                    playerRoom = data.code;
                    rooms.set(data.code, {
                        players: [{ ws, id: playerId }],
                        playerStates: { player1: false, player2: false },
                        platforms: []  // Store platform states
                    });
                    ws.send(JSON.stringify({
                        type: 'join',
                        success: true,
                        isHost: true,
                        playerId
                    }));
                }
                break;

            case 'platformUpdate':
                if (playerRoom && rooms.has(playerRoom)) {
                    const room = rooms.get(playerRoom);
                    room.platforms = data.platforms;  // Update platform state
                    
                    // Send platform state to other player
                    room.players.forEach(player => {
                        if (player.id !== playerId) {
                            player.ws.send(JSON.stringify({
                                type: 'platformUpdate',
                                platforms: data.platforms
                            }));
                        }
                    });
                }
                break;

            case 'ropeUpdate':
                if (playerRoom && rooms.has(playerRoom)) {
                    const room = rooms.get(playerRoom);
                    // Forward rope state to other player
                    room.players.forEach(player => {
                        if (player.id !== playerId) {
                            player.ws.send(JSON.stringify({
                                type: 'ropeUpdate',
                                isHooked: data.isHooked,
                                hookX: data.hookX,
                                hookY: data.hookY,
                                ropeSegments: data.ropeSegments
                            }));
                        }
                    });
                }
                break;

            case 'playerUpdate':
                if (playerRoom && rooms.has(playerRoom)) {
                    const room = rooms.get(playerRoom);
                    
                    // Update player's ready state if this is their first move
                    if (data.hasMovedBefore && !room.playerStates[playerId]) {
                        room.playerStates[playerId] = true;
                        
                        // Check if both players have moved
                        const bothPlayersReady = room.playerStates.player1 && room.playerStates.player2;
                        
                        // Send ready state update to all players
                        room.players.forEach(player => {
                            player.ws.send(JSON.stringify({
                                type: 'readyState',
                                bothPlayersReady,
                                playerStates: room.playerStates
                            }));
                        });
                    }

                    // Forward position to other player regardless of ready state
                    room.players.forEach(player => {
                        if (player.id !== playerId) {
                            player.ws.send(JSON.stringify({
                                type: 'playerUpdate',
                                x: data.x,
                                y: data.y,
                                velocityX: data.velocityX,
                                velocityY: data.velocityY,
                                playerId
                            }));
                        }
                    });
                }
                break;

            case 'requestNewPlatforms':
                if (playerRoom && rooms.has(playerRoom)) {
                    const room = rooms.get(playerRoom);
                    // Forward the request to the host
                    room.players.forEach(player => {
                        if (player.id === 'player1') {  // Send only to host
                            player.ws.send(JSON.stringify({
                                type: 'requestNewPlatforms',
                                highestPlatform: data.highestPlatform
                            }));
                        }
                    });
                }
                break;
        }
    });

    ws.on('close', () => {
        if (playerRoom && rooms.has(playerRoom)) {
            const room = rooms.get(playerRoom);
            // Remove player from room
            room.players = room.players.filter(player => player.ws !== ws);
            // Notify other player about disconnect
            room.players.forEach(player => {
                player.ws.send(JSON.stringify({
                    type: 'playerDisconnect'
                }));
            });
            // Remove room if empty
            if (room.players.length === 0) {
                rooms.delete(playerRoom);
            }
        }
    });
}); 