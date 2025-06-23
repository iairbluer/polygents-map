import {throttle} from "throttle-debounce";
// import {getMovePrompt} from "./movePrompt";
import type {RemotePlayerInterface} from "@workadventure/iframe-api-typings";
import {userJoinedChat} from "./chatPrompt";
import { MapEventsSocket } from "./map-events-socket";

// TODO: import this file ONLY in robot mode

// Create a singleton instance for WebSocket communication
const mapEventsSocket = new MapEventsSocket();

const throttledMovePrompt = throttle(30000, async (destPlayerName: string) => {
    console.log("[throttledMovePrompt] Function called - starting movement evaluation");
    // TODO: do this only if in "waiting mode"
    // const movePrompt = await getMovePrompt();

    // console.log("[throttledMovePrompt] Sending prompt: ", movePrompt);

    try {
        // Get player position
        // const position = await WA.player.getPosition();
        
        // Only send necessary player data to avoid circular references
        // const playerData = {
        //     id: WA.player.id,
        //     name: WA.player.name,
        //     position: {
        //         x: position.x,
        //         y: position.y
        //     },
        //     tags: WA.player.tags
        // };

        // const response = await mapEventsSocket.sendRobotMoveRequest({
        //     type: 'move',
        //     player: playerData,
        //     content: movePrompt,
        // });

        // console.log("[throttledMovePrompt] Response: ", response);
        
        // if (response && response.startsWith("Go to ")) {
        const name = destPlayerName;
        console.log("[throttledMovePrompt] Going to ", name);
        const players = WA.players.list();
        for (const player of players) {
            if (player.name === name) {
                await WA.player.moveTo(player.position.x, player.position.y);
                break;
            }
        }
        // }
    } catch (error) {
        console.error("[throttledMovePrompt] Error sending move request:", error);
    }
}, {
    noTrailing: false,
    noLeading: false,
});

class Robot {
    private mode: "waiting" | "chatting" = "waiting";
    private chatHistory: Array<{role: "system" | "assistant", content: string} | {role: "user", player: RemotePlayerInterface, content: string}> = [];

    init() {
        console.log("[Robot] Robot is starting...");

        // Set up listener for movement commands from backend
        console.log("[Robot] Setting up movement command listener");
        mapEventsSocket.onMovementCommand((destPlayerName: string) => {
            console.log("[Robot] Movement command callback triggered!");
            this.executeMovementCommand(destPlayerName);
        });
        console.log("[Robot] Movement command listener setup complete");

        // WA.players.onVariableChange('currentPlace').subscribe(async () => {
        //     console.log("[Robot] currentPlace variable changed");
        //     if (this.mode === "waiting") {
        //         console.log("[Robot] Mode is waiting, calling throttledMovePrompt");
        //         throttledMovePrompt();
        //     }
        // });

        WA.player.proximityMeeting.onJoin().subscribe((users) => {
            console.log("[Robot] Proximity meeting joined");
            // When we join a proximity meeting, we start chatting
            console.log("users: ", users);
            this.mode = "waiting";
            // TODO: add our own - this.mode = "chatting";

            // TODO: add our own - this.startChat(users);
        });

        WA.player.proximityMeeting.onParticipantJoin().subscribe((user) => {
            console.log("[Robot] Participant joined proximity meeting - ", user);
            this.remotePlayerJoined(user);
        });

        WA.player.proximityMeeting.onLeave().subscribe(() => {
            console.log("[Robot] Left proximity meeting");
            // When we leave a proximity meeting, we stop chatting
            this.mode = "waiting";
        });

        WA.chat.onChatMessage((message, event) => {
            (async () => {
                if (this.mode !== "chatting") {
                    console.warn("Received a chat message while not in chatting mode: ", message, event);
                    return;
                }

                if (!event.author) {
                    // We are receiving our own message, let's ignore it.
                    return;
                }

                this.chatHistory.push({
                    role: "user",
                    player: event.author,
                    content: event.author.name + ": " + message,
                });

                const response = await this.triggerGpt();

                WA.chat.sendChatMessage(response, {
                    scope: "bubble",
                });
            })().catch(e => console.error(e));
        }, {
            scope: "bubble",
        });
    }

    private async executeMovementCommand(destPlayerName: string) {
        try {
            console.log(`[Robot] executeMovementCommand called - executing movement evaluation`);
            // Instead of directly moving to coordinates, trigger the throttled move prompt
            // which will evaluate the situation and decide where to move
            await throttledMovePrompt(destPlayerName);
            console.log(`[Robot] Movement evaluation completed`);
        } catch (error) {
            console.error("[Robot] Error executing movement command:", error);
        }
    }

    // private async startChat(users: RemotePlayerInterface[]) {

    //     if (this.chatHistory.length === 0) {
    //         const chatPrompt = await getChatPrompt(users);

    //         console.log("Sending prompt: ", chatPrompt);

    //         // TODO: only trigger the full script on first start
    //         // For subsequent starts, we should only send the new information about users.

    //         this.chatHistory = [{
    //             role: "system",
    //             content: chatPrompt,
    //         }];

    //         const response = await this.triggerGpt();

    //         WA.chat.sendChatMessage(response, {
    //             scope: "bubble",
    //         });
    //     }
    // }

    private async triggerGpt() {
        const messages = this.chatHistory.map(message => {
            return {
                role: message.role,
                content: message.role === "user" ? message.player.name + ": " + message.content : message.content,
            }
        });

        WA.chat.startTyping({
            scope: "bubble",
        });

        try {
            const response = await mapEventsSocket.sendRobotChatRequest({ messages });
            
            if (response === null || response === undefined) {
                throw new Error("Agent returned no response")
            }
            console.log("Agent response:", response);

            WA.chat.stopTyping({
                scope: "bubble",
            });

            this.chatHistory.push({
                role: "assistant",
                content: response,
            });

            return response;
        } catch (error) {
            WA.chat.stopTyping({
                scope: "bubble",
            });
            console.error("Error getting chat response:", error);
            return "Sorry, I'm having trouble responding right now.";
        }
    }

    private async remotePlayerJoined(user: RemotePlayerInterface) {
        // TODO: properly throttle this by adding players joining to a queue
        if (this.mode === "chatting") {
            this.chatHistory.push({
                role: "system",
                content: userJoinedChat(user),
            });

            const response = await this.triggerGpt();

            WA.chat.sendChatMessage(response, {
                scope: "bubble",
            });
        }
    }
}

export const robot = new Robot();