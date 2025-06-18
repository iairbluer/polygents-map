import { io, Socket } from 'socket.io-client';

export class MapEventsSocket {
  private socket!: Socket;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private connectionPromise: Promise<void>;
  private resolveConnection!: () => void;
  private rejectConnection!: (reason: any) => void;

  constructor() {
    this.connectionPromise = new Promise((resolve, reject) => {
      this.resolveConnection = resolve;
      this.rejectConnection = reject;
    });
    this.initializeSocket();
  }

  private initializeSocket() {
    this.socket = io('http://localhost:3000/map-events', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      transports: ['websocket'],
      upgrade: false
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('Connected to map events WebSocket server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.resolveConnection();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from map events WebSocket server');
      this.isConnected = false;
      // Reset connection promise for next connection attempt
      this.connectionPromise = new Promise((resolve, reject) => {
        this.resolveConnection = resolve;
        this.rejectConnection = reject;
      });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached, falling back to HTTP');
        this.rejectConnection(error);
      }
    });
  }

  public async waitForConnection(): Promise<void> {
    if (this.isConnected) {
      return Promise.resolve();
    }
    return this.connectionPromise;
  }

  public async sendRoomState(players: any[], map: any): Promise<void> {
    try {
      await this.waitForConnection();
      
      this.socket.emit('room-state', { players, map }, (response: any) => {
        if (response?.status === 'error') {
          console.error('Error sending room state:', response.message);
        }
      });
    } catch (error) {
      console.error('Failed to send room state:', error);
      throw error;
    }
  }

  public async sendPlayerMove(player: any, oldPosition: any, newPosition: any): Promise<void> {
    try {
      await this.waitForConnection();

      this.socket.emit('player-move', {
        data: {
          type: 'move',
          player,
          oldPosition,
          newPosition
        }
      }, (response: any) => {
        if (response?.status === 'error') {
          console.error('Error sending player move:', response.message);
        }
      });
    } catch (error) {
      console.error('Failed to send player move:', error);
      throw error;
    }
  }

  public async sendPlayerEnter(player: any): Promise<void> {
    try {
      await this.waitForConnection();

      this.socket.emit('player-enter', {
        data: {
          type: 'enter',
          player
        }
      }, (response: any) => {
        if (response?.status === 'error') {
          console.error('Error sending player enter:', response.message);
        }
      });
    } catch (error) {
      console.error('Failed to send player enter:', error);
      throw error;
    }
  }

  public async sendPlayerLeave(player: any): Promise<void> {
    try {
      await this.waitForConnection();

      this.socket.emit('player-leave', {
        data: {
          type: 'leave',
          player
        }
      }, (response: any) => {
        if (response?.status === 'error') {
          console.error('Error sending player leave:', response.message);
        }
      });
    } catch (error) {
      console.error('Failed to send player leave:', error);
      throw error;
    }
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
} 