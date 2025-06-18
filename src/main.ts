/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra, getVariables } from "@workadventure/scripting-api-extra";
import { updateMyPlace } from "./places";
import { RemotePlayerInterface } from "@workadventure/iframe-api-typings";
import { RemotePlayerMoved } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Players/RemotePlayer";
// import { robot } from "./robot";
import { MapEventsSocket } from "./map-events-socket";

console.log('Script started successfully');

let currentPopup: any = undefined;
let mapEventsSocket: MapEventsSocket;

// Waiting for the API to be ready
WA.onInit().then(async () => {
    console.log('Scripting API ready');
    console.log('Player tags: ',WA.player.tags);
    const variables = await getVariables();
    console.log(variables);

    // Initialize WebSocket connection
    mapEventsSocket = new MapEventsSocket();

    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(async () => {
        console.log('Scripting API Extra ready');
        WA.players.configureTracking({
            players: true,
            movement: true,
        });

        const roomId = WA.room.id;
        const roomIdWithoutProtocol = roomId.split('~')[1];
        console.log('Room ID without protocol: ', roomIdWithoutProtocol);
        const folderName = roomIdWithoutProtocol.split('/')[1];
        const officeName = roomIdWithoutProtocol.split('/')[2];
        console.log('Folder ID: ', folderName);
        console.log('Room ID: ', officeName);
        
        const players = await WA.players.list();
        console.log('Players: ', players);
        const tiledMap = await WA.room.getTiledMap();
        
        // Send initial state through WebSocket
        console.log('Sending initial state through WebSocket...');
        try {
            await mapEventsSocket.sendRoomState([], tiledMap);
            console.log('Initial state sent successfully');
        } catch (error) {
            console.error('Failed to send initial state:', error);
        }

        // Subscribe to player events and forward them through WebSocket
        WA.players.onPlayerMoves.subscribe(async (event: RemotePlayerMoved) => {
            const player = event.player;
            const oldPosition = event.oldPosition;
            const newPosition = event.newPosition;
            console.log(`Player ${player.name} moved from ${oldPosition.x},${oldPosition.y} to ${newPosition.x},${newPosition.y}`);
            
            try {
                console.log(`Sending player move event for ${player.name} through WebSocket`);
                await mapEventsSocket.sendPlayerMove(player, oldPosition, newPosition);
                console.log(`Player move event sent successfully for ${player.name}`);
            } catch (error) {
                console.error(`Failed to send player move event for ${player.name}:`, error);
            }
        });

        WA.players.onPlayerEnters.subscribe(async (player: RemotePlayerInterface) => {
            console.log(`Player ${player.name} entered your nearby zone`);
            
            try {
                console.log(`Sending player enter event for ${player.name} through WebSocket`);
                await mapEventsSocket.sendPlayerEnter(player);
                console.log(`Player enter event sent successfully for ${player.name}`);
            } catch (error) {
                console.error(`Failed to send player enter event for ${player.name}:`, error);
            }
        });

        WA.players.onPlayerLeaves.subscribe(async (player: RemotePlayerInterface) => {
            console.log(`Player ${player.name} left your nearby zone`);
            
            try {
                console.log(`Sending player leave event for ${player.name} through WebSocket`);
                await mapEventsSocket.sendPlayerLeave(player);
                console.log(`Player leave event sent successfully for ${player.name}`);
            } catch (error) {
                console.error(`Failed to send player leave event for ${player.name}:`, error);
            }
        });

        updateMyPlace();
    
        // Let's initialize the "tags" variable to expose our tags to others
        WA.player.state.saveVariable('tags', WA.player.tags, {
            persist: false,
            public: true,
        });

        // robot.init();
       
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

// Clean up WebSocket connection when the window is closed
window.addEventListener('beforeunload', () => {
    if (mapEventsSocket) {
        mapEventsSocket.disconnect();
    }
});

export {};
