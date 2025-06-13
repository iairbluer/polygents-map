/// <reference types="@workadventure/iframe-api-typings" />

import { bootstrapExtra, getVariables } from "@workadventure/scripting-api-extra";
import {updateMyPlace} from "./places";
import { RemotePlayerInterface } from "@workadventure/iframe-api-typings";
import { RemotePlayerMoved } from "@workadventure/iframe-api-typings/play/src/front/Api/Iframe/Players/RemotePlayer";

console.log('Script started successfully');

let currentPopup: any = undefined;

// Waiting for the API to be ready
WA.onInit().then(() => {
    console.log('Scripting API ready');
    console.log('Player tags: ',WA.player.tags);
    const variables = getVariables();
    console.log(variables);


    WA.room.area.onEnter('clock').subscribe(() => {
        const today = new Date();
        const time = today.getHours() + ":" + today.getMinutes();
        currentPopup = WA.ui.openPopup("clockPopup", "It's " + time, []);
    })

    WA.room.area.onLeave('clock').subscribe(closePopup)

    // The line below bootstraps the Scripting API Extra library that adds a number of advanced properties/features to WorkAdventure
    bootstrapExtra().then(() => {
        console.log('Scripting API Extra ready');
        WA.players.configureTracking({
            players: true,
            movement: true,
        });

        const players = WA.players.list();
        const tiledMap = WA.room.getTiledMap();
        
        // Send initial state to backend
        console.log('Sending initial state to backend...');
        fetch('http://localhost:3000/workadventure/room/state', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Map-Source': 'polygents-map',
                
            },
            credentials: 'include',
            body: JSON.stringify({
                players: players,
                map: tiledMap
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            console.log('Initial state sent successfully');
        })
        .catch(error => {
            console.error('Error sending initial state:', error);
        });

        // Subscribe to player events and forward them to backend
        WA.players.onPlayerMoves.subscribe((event: RemotePlayerMoved) => {
            const player = event.player;
            const oldPosition = event.oldPosition;
            const newPosition = event.newPosition;
            console.log(`Player ${player.name} moved from ${oldPosition.x},${oldPosition.y} to ${newPosition.x},${newPosition.y}`);
            
            console.log(`Sending player move event for ${player.name}`);
            fetch('http://localhost:3000/workadventure/room/event/player-move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Map-Source': 'polygents-map',
                },
                credentials: 'include',
                body: JSON.stringify({
                    data: {
                        type: 'move',
                        player: player,
                        oldPosition,
                        newPosition
                    }
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log('Move event sent successfully');
            })
            .catch(error => {
                console.error('Error sending move event:', error);
            });
        });

        WA.players.onPlayerEnters.subscribe((player: RemotePlayerInterface) => {
            console.log(`Player ${player.name} entered your nearby zone`);
            
            console.log(`Sending player enter event for ${player.name}`);
            fetch('http://localhost:3000/workadventure/room/event/player-enter', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Map-Source': 'polygents-map',
                },
                credentials: 'include',
                body: JSON.stringify({
                    data: {
                        type: 'enter',
                        player: player
                    }
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log('Enter event sent successfully');
            })
            .catch(error => {
                console.error('Error sending enter event:', error);
            });
        });

        WA.players.onPlayerLeaves.subscribe((player: RemotePlayerInterface) => {
            console.log(`Player ${player.name} left your nearby zone`);
            
            console.log(`Sending player leave event for ${player.name}`);
            fetch('http://localhost:3000/workadventure/room/event/player-leave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Map-Source': 'polygents-map',
                },
                credentials: 'include',
                body: JSON.stringify({
                    data: {
                        type: 'leave',
                        player: player
                    }
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                console.log('Leave event sent successfully');
            })
            .catch(error => {
                console.error('Error sending leave event:', error);
            });
        });

        
    
        updateMyPlace();
    
        // Let's initialize the "tags" variable to expose our tags to others
        WA.player.state.saveVariable('tags', WA.player.tags, {
            persist: false,
            public: true,
        });

       
    }).catch(e => console.error(e));

}).catch(e => console.error(e));

function closePopup(){
    if (currentPopup !== undefined) {
        currentPopup.close();
        currentPopup = undefined;
    }
}

export {};
