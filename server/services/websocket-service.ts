import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class WebSocketService {
  private io: SocketIOServer;
  private static instance: WebSocketService;

  private constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NODE_ENV === 'development' ? 
          ["http://localhost:5000", "http://127.0.0.1:5000"] : 
          undefined,
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  public static getInstance(server?: HTTPServer): WebSocketService {
    if (!WebSocketService.instance) {
      if (!server) {
        throw new Error('Server instance required for WebSocket initialization');
      }
      WebSocketService.instance = new WebSocketService(server);
    }
    return WebSocketService.instance;
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      // Join user-specific room for cart updates
      socket.on('join-cart-room', (data: { userId?: string; sessionId?: string }) => {
        const roomId = data.userId ? `cart-user-${data.userId}` : `cart-session-${data.sessionId}`;
        socket.join(roomId);
        console.log(`Client ${socket.id} joined cart room: ${roomId}`);
      });

      // Leave cart room
      socket.on('leave-cart-room', (data: { userId?: string; sessionId?: string }) => {
        const roomId = data.userId ? `cart-user-${data.userId}` : `cart-session-${data.sessionId}`;
        socket.leave(roomId);
        console.log(`Client ${socket.id} left cart room: ${roomId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });

      // Ping/Pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
      });
    });
  }

  // Emit cart update to specific user or session
  public emitCartUpdate(userId?: string, sessionId?: string, cartData?: any): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('cart-updated', {
      timestamp: new Date().toISOString(),
      cart: cartData
    });
  }

  // Emit cart item added
  public emitCartItemAdded(userId?: string, sessionId?: string, item?: any): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('cart-item-added', {
      timestamp: new Date().toISOString(),
      item
    });
  }

  // Emit cart item updated
  public emitCartItemUpdated(userId?: string, sessionId?: string, item?: any): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('cart-item-updated', {
      timestamp: new Date().toISOString(),
      item
    });
  }

  // Emit cart item removed
  public emitCartItemRemoved(userId?: string, sessionId?: string, itemId?: string): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('cart-item-removed', {
      timestamp: new Date().toISOString(),
      itemId
    });
  }

  // Emit cart cleared
  public emitCartCleared(userId?: string, sessionId?: string): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('cart-cleared', {
      timestamp: new Date().toISOString()
    });
  }

  // Emit coupon applied
  public emitCouponApplied(userId?: string, sessionId?: string, coupon?: any): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('coupon-applied', {
      timestamp: new Date().toISOString(),
      coupon
    });
  }

  // Emit coupon removed
  public emitCouponRemoved(userId?: string, sessionId?: string, couponId?: string): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('coupon-removed', {
      timestamp: new Date().toISOString(),
      couponId
    });
  }

  // Emit cart validation updates
  public emitCartValidation(userId?: string, sessionId?: string, validation?: any): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('cart-validation', {
      timestamp: new Date().toISOString(),
      validation
    });
  }

  // Emit save for later updates
  public emitSaveForLater(userId?: string, sessionId?: string, itemIds?: string[]): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('items-saved-for-later', {
      timestamp: new Date().toISOString(),
      itemIds
    });
  }

  // Emit move to cart updates
  public emitMoveToCart(userId?: string, sessionId?: string, itemIds?: string[]): void {
    const roomId = userId ? `cart-user-${userId}` : `cart-session-${sessionId}`;
    
    this.io.to(roomId).emit('items-moved-to-cart', {
      timestamp: new Date().toISOString(),
      itemIds
    });
  }

  // Get IO instance for custom events
  public getIO(): SocketIOServer {
    return this.io;
  }

  // Get connected clients count
  public getConnectedClientsCount(): number {
    return this.io.engine.clientsCount;
  }

  // Get room client count
  public getRoomClientCount(roomId: string): number {
    const room = this.io.sockets.adapter.rooms.get(roomId);
    return room ? room.size : 0;
  }

  // Broadcast to all connected clients (admin notifications, etc.)
  public broadcast(event: string, data: any): void {
    this.io.emit(event, {
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

export default WebSocketService;