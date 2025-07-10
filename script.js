
class ChatApp {
  constructor() {
    this.username = '';
    this.currentRoom = null;
    this.isConnected = false;
    this.roomTimer = null;
    this.roomTimeoutId = null;
    this.emptyRoomTimeoutId = null;
    this.timerInterval = null;

    this.initializeElements();
    this.bindEvents();
    this.startRoomCleanup();
  }

  initializeElements() {
    this.usernameInput = document.getElementById('usernameInput');
    this.roomCodeInput = document.getElementById('roomCodeInput');
    this.joinRoomBtn = document.getElementById('joinRoomBtn');
    this.createRoomBtn = document.getElementById('createRoomBtn');
    this.roomSetup = document.getElementById('roomSetup');
    this.chatArea = document.getElementById('chatArea');
    this.messagesContainer = document.getElementById('messagesContainer');
    this.messageInput = document.getElementById('messageInput');
    this.sendBtn = document.getElementById('sendBtn');
    this.roomCodeDisplay = document.getElementById('roomCodeDisplay');
    this.roomTimer = document.getElementById('roomTimer');
    this.leaveRoomBtn = document.getElementById('leaveRoomBtn');
  }

  bindEvents() {
    this.joinRoomBtn.addEventListener('click', () => this.joinRoom());
    this.createRoomBtn.addEventListener('click', () => this.createRoom());
    this.leaveRoomBtn.addEventListener('click', () => this.leaveRoom());
    
    this.usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (this.roomCodeInput.value.trim()) {
          this.joinRoom();
        } else {
          this.createRoom();
        }
      }
    });

    this.roomCodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.joinRoom();
    });

    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // Listen for storage events to simulate real-time chat
    window.addEventListener('storage', (e) => {
      if (e.key === 'chatRooms' && this.currentRoom && this.isConnected) {
        // Only reload if there are actually new messages
        const rooms = this.getRooms();
        const room = rooms[this.currentRoom];
        if (room && room.messages.length !== this.messagesContainer.children.length) {
          this.loadMessages();
        }
      }
    });

    // Handle page unload/visibility change
    window.addEventListener('beforeunload', () => {
      if (this.isConnected && this.currentRoom) {
        this.handleUserLeaving();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isConnected && this.currentRoom) {
        this.handleUserLeaving();
      }
    });
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Simple encryption/decryption (for demo purposes)
  encryptMessage(message) {
    // In a real app, use proper encryption like AES
    return btoa(message);
  }

  decryptMessage(encryptedMessage) {
    try {
      return atob(encryptedMessage);
    } catch (e) {
      return encryptedMessage; // Fallback for unencrypted messages
    }
  }

  createRoom() {
    const username = this.usernameInput.value.trim();
    if (!username) {
      this.showError('Please enter a username');
      return;
    }

    if (username.length < 2) {
      this.showError('Username must be at least 2 characters long');
      return;
    }

    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      messages: [],
      users: [username],
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.saveRoom(room);
    this.joinRoomWithCode(username, roomCode);
  }

  joinRoom() {
    const username = this.usernameInput.value.trim();
    const roomCode = this.roomCodeInput.value.trim().toUpperCase();

    if (!username) {
      this.showError('Please enter a username');
      return;
    }

    if (username.length < 2) {
      this.showError('Username must be at least 2 characters long');
      return;
    }

    if (!roomCode) {
      this.showError('Please enter a room code');
      return;
    }

    const rooms = this.getRooms();
    const room = rooms[roomCode];

    if (!room) {
      this.showError('Room not found. Please check the room code.');
      return;
    }

    // Check if username is already taken in this room by active users
    if (room.users.includes(username)) {
      this.showError('Username is already taken in this room');
      return;
    }

    // Add user to room if not already there
    if (!room.users.includes(username)) {
      room.users.push(username);
    }
    room.lastActivity = Date.now();
    this.saveRoom(room);

    this.joinRoomWithCode(username, roomCode);
  }

  joinRoomWithCode(username, roomCode) {
    this.username = username;
    this.currentRoom = roomCode;
    this.isConnected = true;

    // Hide room setup, show chat
    this.roomSetup.style.display = 'none';
    this.chatArea.style.display = 'flex';

    // Update room info
    this.roomCodeDisplay.textContent = `Room: ${roomCode}`;
    this.updateRoomTimer();

    // Add system message
    this.addSystemMessage(`${username} joined the room`, false);

    // Load existing messages
    this.loadMessages();

    // Focus on message input
    this.messageInput.focus();

    // Start room timer
    this.startRoomTimer();

    // Clear empty room timeout if it exists
    if (this.emptyRoomTimeoutId) {
      clearTimeout(this.emptyRoomTimeoutId);
      this.emptyRoomTimeoutId = null;
    }
  }

  leaveRoom() {
    if (this.isConnected && this.currentRoom) {
      this.handleUserLeaving();
    }
    this.resetToRoomSetup();
  }

  handleUserLeaving() {
    this.addSystemMessage(`${this.username} left the room`, false);
    this.removeUserFromRoom();
  }

  removeUserFromRoom() {
    const rooms = this.getRooms();
    const room = rooms[this.currentRoom];
    
    if (room) {
      room.users = room.users.filter(user => user !== this.username);
      room.lastActivity = Date.now();
      
      if (room.users.length === 0) {
        // Start 5-minute timer for empty room
        this.startEmptyRoomTimer(this.currentRoom);
      }
      
      this.saveRoom(room);
    }
  }

  startEmptyRoomTimer(roomCode) {
    // Delete empty room after 5 minutes
    setTimeout(() => {
      const rooms = this.getRooms();
      const room = rooms[roomCode];
      
      if (room && room.users.length === 0) {
        delete rooms[roomCode];
        localStorage.setItem('chatRooms', JSON.stringify(rooms));
      }
    }, 300000); // 5 minutes
  }

  resetToRoomSetup() {
    this.isConnected = false;
    this.currentRoom = null;
    this.username = '';
    
    // Clear inputs
    this.usernameInput.value = '';
    this.roomCodeInput.value = '';
    
    // Show room setup, hide chat
    this.roomSetup.style.display = 'block';
    this.chatArea.style.display = 'none';
    
    // Clear messages
    this.messagesContainer.innerHTML = '';
    
    // Clear all timers
    if (this.roomTimeoutId) {
      clearTimeout(this.roomTimeoutId);
      this.roomTimeoutId = null;
    }
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    if (this.emptyRoomTimeoutId) {
      clearTimeout(this.emptyRoomTimeoutId);
      this.emptyRoomTimeoutId = null;
    }
  }

  sendMessage() {
    const content = this.messageInput.value.trim();
    if (!content || !this.isConnected || !this.currentRoom) return;

    const encryptedContent = this.encryptMessage(content);
    const message = {
      id: Date.now(),
      username: this.username,
      content: encryptedContent,
      timestamp: new Date().toLocaleTimeString(),
      type: 'user'
    };

    this.addMessage(message);
    this.messageInput.value = '';
    this.saveMessage(message);
    this.updateRoomActivity();
  }

  addMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${message.username === this.username ? 'own' : 'other'}`;

    if (message.type === 'system') {
      messageDiv.className = 'message system';
      messageDiv.innerHTML = `<div class="message-content">${message.content}</div>`;
    } else {
      const decryptedContent = this.decryptMessage(message.content);
      messageDiv.innerHTML = `
        <div class="message-header">${message.username} • ${message.timestamp}</div>
        <div class="message-content">${this.escapeHtml(decryptedContent)}</div>
      `;
    }

    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  addSystemMessage(content, encrypted = true) {
    const message = {
      id: Date.now(),
      content: encrypted ? this.encryptMessage(content) : content,
      timestamp: new Date().toLocaleTimeString(),
      type: 'system'
    };

    this.addMessage(message);
    this.saveMessage(message);
  }

  saveMessage(message) {
    if (!this.currentRoom) return;

    const rooms = this.getRooms();
    const room = rooms[this.currentRoom];
    
    if (room) {
      room.messages.push(message);
      // Keep only last 50 messages per room
      if (room.messages.length > 50) {
        room.messages.splice(0, room.messages.length - 50);
      }
      room.lastActivity = Date.now();
      this.saveRoom(room);
    }
  }

  saveRoom(room) {
    const rooms = this.getRooms();
    rooms[room.code] = room;
    localStorage.setItem('chatRooms', JSON.stringify(rooms));
  }

  getRooms() {
    return JSON.parse(localStorage.getItem('chatRooms') || '{}');
  }

  loadMessages() {
    if (!this.currentRoom) return;

    const rooms = this.getRooms();
    const room = rooms[this.currentRoom];
    
    if (room) {
      this.messagesContainer.innerHTML = '';
      room.messages.forEach(message => this.addMessage(message));
    }
  }

  updateRoomActivity() {
    if (!this.currentRoom) return;

    const rooms = this.getRooms();
    const room = rooms[this.currentRoom];
    
    if (room) {
      room.lastActivity = Date.now();
      this.saveRoom(room);
    }

    // Reset room timer
    this.startRoomTimer();
  }

  startRoomTimer() {
    if (this.roomTimeoutId) {
      clearTimeout(this.roomTimeoutId);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }

    // Set 1 hour timeout (3600000 ms)
    this.roomTimeoutId = setTimeout(() => {
      if (this.currentRoom) {
        this.addSystemMessage('Room deleted due to inactivity', false);
        setTimeout(() => {
          this.deleteRoom(this.currentRoom);
          this.resetToRoomSetup();
        }, 2000);
      }
    }, 3600000); // 1 hour

    this.updateRoomTimer();
    
    // Update timer every minute without blinking
    this.timerInterval = setInterval(() => {
      this.updateRoomTimer();
    }, 60000);
  }

  updateRoomTimer() {
    if (!this.currentRoom) return;

    const rooms = this.getRooms();
    const room = rooms[this.currentRoom];
    
    if (room) {
      const now = Date.now();
      const timeLeft = 3600000 - (now - room.lastActivity); // 1 hour in ms
      
      if (timeLeft > 0) {
        const minutes = Math.floor(timeLeft / 60000);
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        
        const newText = `Expires in: ${hours}h ${remainingMinutes}m`;
        if (this.roomTimer.textContent !== newText) {
          this.roomTimer.textContent = newText;
        }
      } else {
        this.roomTimer.textContent = 'Room expired';
      }
    }
  }

  deleteRoom(roomCode) {
    const rooms = this.getRooms();
    delete rooms[roomCode];
    localStorage.setItem('chatRooms', JSON.stringify(rooms));
  }

  startRoomCleanup() {
    // Clean up expired rooms every 5 minutes
    setInterval(() => {
      const rooms = this.getRooms();
      const now = Date.now();
      const oneHour = 3600000; // 1 hour in milliseconds
      const fiveMinutes = 300000; // 5 minutes in milliseconds

      for (const [roomCode, room] of Object.entries(rooms)) {
        // Delete rooms that have been inactive for 1 hour
        if (now - room.lastActivity > oneHour) {
          delete rooms[roomCode];
        }
        // Delete empty rooms that have been empty for 5 minutes
        else if (room.users.length === 0 && now - room.lastActivity > fiveMinutes) {
          delete rooms[roomCode];
        }
      }

      localStorage.setItem('chatRooms', JSON.stringify(rooms));
    }, 300000); // Check every 5 minutes
  }

  showError(message) {
    // Create a compact error toast like WhatsApp
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 500;
      font-size: 14px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
      animation: slideIn 0.3s ease-out;
      max-width: 80%;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Add CSS for error animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Initialize the chat app when the page loads
document.addEventListener('DOMContentLoaded', () => {
  new ChatApp();
});
