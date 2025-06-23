# Robot Usage Guide

## Overview
The robot system enables AI-powered bots to interact within WorkAdventure using WebSocket communication with the mock-agent-backend. The robot functionality is always active and ready to receive commands.

## Architecture

### Frontend (polygents-map)
- **robot.ts**: Main robot class that handles movement and chat logic
- **map-events-socket.ts**: WebSocket client for communication with backend
- **main.ts**: Always initializes robot when map loads

### Backend (mock-agent-backend)
- **map-events.gateway.ts**: WebSocket server that handles robot requests
- **workadventure.service.ts**: Contains robot processing logic

## Robot Behaviors

### Movement
- Robot can be triggered to move via backend API call to `moveAgent`
- Backend sends movement trigger command to robot via WebSocket
- Robot executes `throttledMovePrompt()` function which evaluates environment
- Robot decides autonomously where to move based on AI logic
- Movement is throttled to every 30 seconds to prevent spam

### Chat
- Robot joins proximity meetings (chat bubbles) automatically
- Responds to chat messages using simple AI logic
- Shows typing indicator while processing responses

## WebSocket Events

### Movement Flow
1. **Backend API**: `POST /workadventure/agent/{agentId}/move` 
2. **WebSocket Event**: `robot-move-command` with `{ trigger: true }`
3. **Robot Action**: Executes `throttledMovePrompt()` and evaluates movement
4. **Robot Decision**: Moves to appropriate location based on AI logic

### Robot Move Request (Internal)
- **Event**: `robot-move-request`
- **Payload**: `{ data: { type: 'move', player: PlayerObject, content: string } }`
- **Response**: String with movement instruction (e.g., "Go to PlayerName" or "Stay put")

### Robot Chat Request
- **Event**: `robot-chat-request`
- **Payload**: `{ messages: ChatMessage[] }`
- **Response**: String with chat response

## Development Notes

### Movement Logic
The robot movement is triggered externally but executes autonomously:
1. External systems call the `moveAgent` API endpoint
2. Backend sends WebSocket trigger to robot
3. Robot evaluates its environment using existing `throttledMovePrompt()` 
4. Robot makes autonomous movement decisions

### Always Active
The robot is always initialized when the map loads - no special URL parameters needed. This allows for seamless WebSocket communication between the frontend and backend.

### Mock AI Responses
Currently using simple mock responses in `workadventure.service.ts`:
- Chat responses based on keyword matching
- Movement decisions based on content analysis
- TODO: Replace with actual AI agent integration

### Future Enhancements
- Integrate with real AI services (OpenAI, etc.)
- Add more sophisticated behavior patterns
- Implement robot memory and context awareness
- Add voice interaction capabilities

## Testing

1. Start the mock-agent-backend:
   ```bash
   cd mock-agent-backend
   npm run start:dev
   ```

2. Deploy the map:
   ```bash
   cd polygents-map
   npm run build
   cd ..
   node tools/dist/deploy-map.js
   ```

3. Access WorkAdventure (robot is automatically active):
   ```
   http://play.workadventure.localhost/~/polygents_office/office.tmj
   ```

4. Trigger robot movement via API:
   ```bash
   curl -X POST http://localhost:3000/workadventure/agent/test-robot/move \
     -H "Content-Type: application/json" \
     -d '{"xPosition": 100, "yPosition": 100}'
   ```

## Troubleshooting

- Ensure mock-agent-backend is running on port 3000
- Check browser console for WebSocket connection errors
- Verify WorkAdventure is running via docker-compose
- Check that the map is deployed correctly
- Robot should initialize automatically when map loads 