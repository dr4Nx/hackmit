import pkg from '@mentra/sdk';
const { AppServer, AppSession } = pkg;
import express from 'express';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://127.0.0.1:8000';
const RTMP_SERVER_URL = process.env.RTMP_SERVER_URL ?? (() => { throw new Error('RTMP_SERVER_URL is not set in .env file'); })();
const STREAM_AUTO_START = process.env.STREAM_AUTO_START === 'true' || false;

// Stream state management
const streamSessions = new Map(); // sessionId -> { session, streamStatus, cleanup }

class VideoStreamApp extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      mentraOSWebsocketUrl: 'wss://uscentralapi.mentra.glass/app-ws',
    });
    this.wsClients = new Set();
    this.streamSessions = streamSessions;
    this.setupRoutes();
    this.setupWebSocket();
  }

  async onSession(session, sessionId, userId) {
    this.logger.info(`Session started for user ${userId}`);

    // Initialize session state
    const sessionState = {
      session,
      streamStatus: 'stopped',
      cleanup: []
    };
    this.streamSessions.set(sessionId, sessionState);

    session.events.onError(error => {
      this.logger.error(`Session error for user ${userId}:`, error);
    });

    session.events.onDisconnected(() => {
      this.logger.info(`Session disconnected for user ${userId}`);
      this.cleanupSession(sessionId);
    });

    // Setup stream status monitoring
    const streamStatusCleanup = session.camera.onStreamStatus(status => {
      this.logger.info(`Stream status update for user ${userId}:`, status.status);
      sessionState.streamStatus = status.status;
      
      this.broadcastStreamStatus(sessionId, userId, status);
      
      if (status.status === "active") {
        this.logger.info(`Streaming active to: ${session.camera.getCurrentStreamUrl()}`);
        session.layouts.showTextWall("📡 Streaming Active");
      } else if (status.status === "error") {
        this.logger.error(`Stream error: ${status.errorDetails}`);
        session.layouts.showTextWall("❌ Stream Error");
      } else if (status.status === "stopped") {
        this.logger.info("Stream stopped");
        session.layouts.showTextWall("⏹️ Stream Stopped");
      }
    });

    sessionState.cleanup.push(streamStatusCleanup);

    // Voice command handling for streaming
    const transcriptionCleanup = session.events.onTranscription(data => {
      if (!data.isFinal) return;
      const spokenText = data.text.toLowerCase().trim().replace(/,/g, "");
      this.logger.debug(`Heard: "${spokenText}"`);
      
      if (spokenText.includes('hey little chef start streaming')) {
        this.logger.info("🎤 Start streaming command detected!");
        this.startStreaming(sessionId, userId, data.text).catch(error => {
          this.logger.error(`Start streaming error: ${error}`);
        });
      } else if (spokenText.includes('hey little chef stop streaming')) {
        this.logger.info("🎤 Stop streaming command detected!");
        this.stopStreaming(sessionId, userId, data.text).catch(error => {
          this.logger.error(`Stop streaming error: ${error}`);
        });
      } else if (spokenText.includes('hey little chef')) {
        // Default behavior - toggle streaming
        this.logger.info("🎤 Voice activation phrase detected!");
        this.toggleStreaming(sessionId, userId, data.text).catch(error => {
          this.logger.error(`Toggle streaming error: ${error}`);
        });
      }
    });

    sessionState.cleanup.push(transcriptionCleanup);

    // Auto-start streaming if configured
    if (STREAM_AUTO_START) {
      this.logger.info("Auto-starting stream...");
      this.startStreaming(sessionId, userId, "Auto-start").catch(error => {
        this.logger.error(`Auto-start streaming error: ${error}`);
      });
    }

    this.addCleanupHandler(() => this.cleanupSession(sessionId));
  }

  // Streaming control methods
  async startStreaming(sessionId, userId, command) {
    try {
      const sessionState = this.streamSessions.get(sessionId);
      if (!sessionState) {
        this.logger.error(`Session not found: ${sessionId}`);
        return;
      }

      if (sessionState.streamStatus === 'active') {
        this.logger.info(`Stream already active for user ${userId}`);
        sessionState.session.layouts.showTextWall("📡 Already streaming");
        return;
      }

      this.logger.info(`📡 Starting stream for user ${userId} to ${RTMP_SERVER_URL}`);
      
      // Broadcast command received
      this.broadcastVoiceDetected(command, 'start_streaming');
      
      sessionState.session.layouts.showTextWall("📡 Starting stream...");
      
      await sessionState.session.camera.startStream({
        rtmpUrl: RTMP_SERVER_URL
      });

      this.logger.info(`✅ Stream start requested for user ${userId}`);

    } catch (error) {
      this.logger.error(`Error starting stream for user ${userId}: ${error}`);
      const sessionState = this.streamSessions.get(sessionId);
      if (sessionState) {
        sessionState.session.layouts.showTextWall("❌ Stream start failed");
      }
    }
  }

  async stopStreaming(sessionId, userId, command) {
    try {
      const sessionState = this.streamSessions.get(sessionId);
      if (!sessionState) {
        this.logger.error(`Session not found: ${sessionId}`);
        return;
      }

      if (sessionState.streamStatus === 'stopped') {
        this.logger.info(`Stream already stopped for user ${userId}`);
        sessionState.session.layouts.showTextWall("⏹️ Already stopped");
        return;
      }

      this.logger.info(`⏹️ Stopping stream for user ${userId}`);
      
      // Broadcast command received
      this.broadcastVoiceDetected(command, 'stop_streaming');
      
      sessionState.session.layouts.showTextWall("⏹️ Stopping stream...");
      
      await sessionState.session.camera.stopStream();

      this.logger.info(`✅ Stream stop requested for user ${userId}`);

    } catch (error) {
      this.logger.error(`Error stopping stream for user ${userId}: ${error}`);
      const sessionState = this.streamSessions.get(sessionId);
      if (sessionState) {
        sessionState.session.layouts.showTextWall("❌ Stream stop failed");
      }
    }
  }

  async toggleStreaming(sessionId, userId, command) {
    const sessionState = this.streamSessions.get(sessionId);
    if (!sessionState) {
      this.logger.error(`Session not found: ${sessionId}`);
      return;
    }

    if (sessionState.streamStatus === 'active') {
      await this.stopStreaming(sessionId, userId, command);
    } else {
      await this.startStreaming(sessionId, userId, command);
    }
  }

  cleanupSession(sessionId) {
    const sessionState = this.streamSessions.get(sessionId);
    if (sessionState) {
      // Run all cleanup functions
      sessionState.cleanup.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          this.logger.error(`Cleanup error: ${error}`);
        }
      });
      
      // Stop streaming if active
      if (sessionState.streamStatus === 'active') {
        sessionState.session.camera.stopStream().catch(error => {
          this.logger.error(`Error stopping stream during cleanup: ${error}`);
        });
      }
      
      this.streamSessions.delete(sessionId);
      this.logger.info(`Session ${sessionId} cleaned up`);
    }
  }

  setupWebSocket() {
    const server = createServer();
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', ws => {
      this.wsClients.add(ws);
      this.logger.info('WebSocket client connected');

      ws.on('close', () => {
        this.wsClients.delete(ws);
        this.logger.info('WebSocket client disconnected');
      });

      ws.on('error', error => {
        this.logger.error('WebSocket error:', error);
        this.wsClients.delete(ws);
      });
    });
    server.listen(PORT + 1, () => {
      this.logger.info(`WebSocket server running on port ${PORT + 1}`);
    });
  }

  /* Broadcast voice detected with streaming context */
  broadcastVoiceDetected(fullSpokenText, action = 'streaming_command') {
    const message = JSON.stringify({
      type: 'voice_detected',
      data: { 
        message: 'Voice command detected!',
        spokenText: fullSpokenText,
        action: action
      }
    });
    this.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast stream status updates to frontend
   */
  broadcastStreamStatus(sessionId, userId, status) {
    const message = JSON.stringify({
      type: 'stream_status',
      data: {
        sessionId: sessionId,
        userId: userId,
        status: status.status,
        timestamp: new Date().getTime(),
        rtmpUrl: RTMP_SERVER_URL,
        errorDetails: status.errorDetails || null
      }
    });
    this.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Broadcast stream command results to frontend
   */
  broadcastStreamCommand(command, success, sessionId, userId, message) {
    const broadcastMessage = JSON.stringify({
      type: 'stream_command_result',
      data: {
        command: command,
        success: success,
        sessionId: sessionId,
        userId: userId,
        message: message,
        timestamp: new Date().getTime()
      }
    });
    this.wsClients.forEach(client => {
      if (client.readyState === 1) {
        client.send(broadcastMessage);
      }
    });
  }

  async onStop(sessionId, userId, reason) {
    this.logger.info(`Session stopped for user ${userId}, reason: ${reason}`);
    this.cleanupSession(sessionId);
  }

  setupRoutes() {
    const app = this.getExpressApp();
    app.use(express.static('public'));

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MentraOS RTMP Stream</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f0f0f0;
            }
            .container { 
              max-width: 800px; 
              margin: 0 auto; 
              background: white; 
              padding: 20px; 
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { 
              text-align: center; 
              color: #333; 
              margin-bottom: 30px;
            }
            .stream-status {
              text-align: center;
              padding: 20px;
              margin: 20px 0;
              border-radius: 10px;
              font-size: 18px;
              font-weight: bold;
            }
            .status-stopped { background: #f8d7da; color: #721c24; }
            .status-active { background: #d4edda; color: #155724; }
            .status-error { background: #fff3cd; color: #856404; }
            .controls { 
              text-align: center; 
              margin: 20px 0;
            }
            .instructions { 
              text-align: center; 
              margin: 20px 0; 
              padding: 15px; 
              background: #e8f5e8; 
              border-radius: 5px;
            }
            button { 
              background: #007bff; 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 5px; 
              cursor: pointer; 
              margin: 5px;
              font-size: 16px;
            }
            button:hover { 
              background: #0056b3; 
            }
            button:disabled {
              background: #6c757d;
              cursor: not-allowed;
            }
            .stream-info {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .spoken-text {
              text-align: center; 
              margin: 20px 0; 
              padding: 15px; 
              background: #f8f9fa; 
              border-radius: 5px; 
              border-left: 4px solid #007bff; 
              font-style: italic; 
              display: none;
            }
            .stream-log {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
              max-height: 300px;
              overflow-y: auto;
              font-family: monospace;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📡 MentraOS RTMP Stream</h1>
            
            <div class="instructions">
              <p>🎤 Voice Commands for MentraOS glasses:</p>
              <p><strong>"Hey little chef start streaming"</strong> - Start RTMP stream</p>
              <p><strong>"Hey little chef stop streaming"</strong> - Stop RTMP stream</p>
              <p><strong>"Hey little chef"</strong> - Toggle streaming on/off</p>
            </div>

            <div class="stream-status status-stopped" id="streamStatus">
              📡 Stream Status: Stopped
            </div>

            <div class="spoken-text" id="spokenText">
              <strong>You said:</strong> <span id="spokenTextContent"></span>
            </div>

            <div class="controls">
              <button onclick="startStream()" id="startBtn">▶️ Start Stream</button>
              <button onclick="stopStream()" id="stopBtn" disabled>⏹️ Stop Stream</button>
              <button onclick="refreshStatus()">🔄 Refresh Status</button>
            </div>

            <div class="stream-info" id="streamInfo">
              <h3>Stream Information</h3>
              <p><strong>RTMP URL:</strong> <span id="rtmpUrl">Loading...</span></p>
              <p><strong>Sessions:</strong> <span id="sessionCount">0</span></p>
              <p><strong>Last Update:</strong> <span id="lastUpdate">Never</span></p>
            </div>

            <div class="stream-log" id="streamLog">
              <h4>Stream Events Log</h4>
              <div id="logContent">Connecting to WebSocket...</div>
            </div>
          </div>

          <script>
            let currentStreamStatus = 'stopped';
            let ws = null;
            
            // Connect to WebSocket for real-time updates
            function connectWebSocket() {
              const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
              const wsUrl = \`\${protocol}//\${window.location.hostname}:3001\`;
              
              ws = new WebSocket(wsUrl);
              
              ws.onopen = function() {
                console.log('WebSocket connected');
                addLogEntry('✅ WebSocket connected');
              };
              
              ws.onmessage = function(event) {
                const message = JSON.parse(event.data);
                console.log('WebSocket message received:', message);
                handleWebSocketMessage(message);
              };
              
              ws.onclose = function() {
                console.log('WebSocket disconnected, reconnecting...');
                addLogEntry('❌ WebSocket disconnected, reconnecting...');
                setTimeout(connectWebSocket, 1000);
              };
              
              ws.onerror = function(error) {
                console.error('WebSocket error:', error);
                addLogEntry('❌ WebSocket error: ' + error);
              };
            }
            
            function handleWebSocketMessage(message) {
              switch(message.type) {
                case 'voice_detected':
                  showVoiceFeedback(message.data.spokenText, message.data.action);
                  addLogEntry(\`🎤 Voice: "\${message.data.spokenText}" (Action: \${message.data.action})\`);
                  break;
                case 'stream_status':
                  updateStreamStatus(message.data);
                  addLogEntry(\`📡 Stream status: \${message.data.status} (Session: \${message.data.sessionId})\`);
                  break;
                case 'stream_command_result':
                  addLogEntry(\`⚡ Command \${message.data.command}: \${message.data.success ? 'SUCCESS' : 'FAILED'} - \${message.data.message}\`);
                  break;
                default:
                  addLogEntry(\`📨 Unknown message type: \${message.type}\`);
              }
            }
            
            function showVoiceFeedback(spokenText, action) {
              const spokenTextDiv = document.getElementById('spokenText');
              const spokenTextContent = document.getElementById('spokenTextContent');
              
              if (spokenText) {
                spokenTextContent.textContent = spokenText;
                spokenTextDiv.style.display = 'block';
                setTimeout(() => {
                  spokenTextDiv.style.display = 'none';
                }, 5000);
              }
            }
            
            function updateStreamStatus(data) {
              currentStreamStatus = data.status;
              const statusElement = document.getElementById('streamStatus');
              const startBtn = document.getElementById('startBtn');
              const stopBtn = document.getElementById('stopBtn');
              const rtmpUrl = document.getElementById('rtmpUrl');
              const lastUpdate = document.getElementById('lastUpdate');
              
              // Update status display
              statusElement.className = 'stream-status status-' + data.status;
              
              switch(data.status) {
                case 'active':
                  statusElement.textContent = '📡 Stream Status: Active';
                  startBtn.disabled = true;
                  stopBtn.disabled = false;
                  break;
                case 'stopped':
                  statusElement.textContent = '📡 Stream Status: Stopped';
                  startBtn.disabled = false;
                  stopBtn.disabled = true;
                  break;
                case 'error':
                  statusElement.textContent = '📡 Stream Status: Error - ' + (data.errorDetails || 'Unknown error');
                  startBtn.disabled = false;
                  stopBtn.disabled = false;
                  break;
                default:
                  statusElement.textContent = '📡 Stream Status: ' + data.status;
              }
              
              // Update stream info
              rtmpUrl.textContent = data.rtmpUrl || 'Not configured';
              lastUpdate.textContent = new Date(data.timestamp).toLocaleString();
            }
            
            function addLogEntry(message) {
              const logContent = document.getElementById('logContent');
              const timestamp = new Date().toLocaleTimeString();
              logContent.innerHTML += \`<div>[\${timestamp}] \${message}</div>\`;
              logContent.scrollTop = logContent.scrollHeight;
            }
            
            async function startStream() {
              try {
                const response = await fetch('/api/stream/start', { method: 'POST' });
                const result = await response.json();
                addLogEntry('🎬 Start stream request sent: ' + result.message);
              } catch (error) {
                addLogEntry('❌ Failed to start stream: ' + error.message);
              }
            }
            
            async function stopStream() {
              try {
                const response = await fetch('/api/stream/stop', { method: 'POST' });
                const result = await response.json();
                addLogEntry('⏹️ Stop stream request sent: ' + result.message);
              } catch (error) {
                addLogEntry('❌ Failed to stop stream: ' + error.message);
              }
            }
            
            async function refreshStatus() {
              try {
                const response = await fetch('/api/stream/status');
                const result = await response.json();
                document.getElementById('sessionCount').textContent = result.sessions.length;
                addLogEntry('🔄 Status refreshed: ' + result.sessions.length + ' sessions');
              } catch (error) {
                addLogEntry('❌ Failed to refresh status: ' + error.message);
              }
            }
            
            // Start WebSocket connection and load initial data
            connectWebSocket();
            refreshStatus();
          </script>
        </body>
        </html>
      `);
    });


    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: 'MentraOS RTMP Stream App is running' });
    });

    // Stream management endpoints
    app.post('/api/stream/start', async (req, res) => {
      try {
        const activeSessions = Array.from(this.streamSessions.entries())
          .filter(([_, sessionState]) => sessionState.streamStatus !== 'stopped');
        
        if (activeSessions.length === 0) {
          return res.status(404).json({ 
            error: 'No active sessions found', 
            message: 'Connect MentraOS glasses first' 
          });
        }

        // Start streaming on the first available session
        const [sessionId, sessionState] = activeSessions[0];
        const userId = sessionId; // Using sessionId as userId for simplicity
        
        await this.startStreaming(sessionId, userId, 'Manual start via API');
        
        res.json({ 
          message: 'Stream start requested',
          sessionId: sessionId,
          rtmpUrl: RTMP_SERVER_URL
        });
      } catch (error) {
        this.logger.error('API start stream error:', error);
        res.status(500).json({ error: 'Failed to start stream', details: error.message });
      }
    });

    app.post('/api/stream/stop', async (req, res) => {
      try {
        const activeSessions = Array.from(this.streamSessions.entries())
          .filter(([_, sessionState]) => sessionState.streamStatus === 'active');
        
        if (activeSessions.length === 0) {
          return res.json({ 
            message: 'No active streams to stop' 
          });
        }

        // Stop all active streams
        const stopPromises = activeSessions.map(async ([sessionId, sessionState]) => {
          const userId = sessionId; // Using sessionId as userId for simplicity
          await this.stopStreaming(sessionId, userId, 'Manual stop via API');
        });

        await Promise.all(stopPromises);
        
        res.json({ 
          message: 'Stream stop requested for all active sessions',
          stoppedSessions: activeSessions.length
        });
      } catch (error) {
        this.logger.error('API stop stream error:', error);
        res.status(500).json({ error: 'Failed to stop stream', details: error.message });
      }
    });

    app.get('/api/stream/status', (req, res) => {
      const sessions = Array.from(this.streamSessions.entries()).map(([sessionId, sessionState]) => ({
        sessionId: sessionId,
        status: sessionState.streamStatus,
        rtmpUrl: RTMP_SERVER_URL
      }));

      res.json({
        rtmpUrl: RTMP_SERVER_URL,
        autoStart: STREAM_AUTO_START,
        sessions: sessions,
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.status === 'active').length
      });
    });

    // Get detailed session information
    app.get('/api/sessions', (req, res) => {
      const sessions = Array.from(this.streamSessions.entries()).map(([sessionId, sessionState]) => ({
        sessionId: sessionId,
        status: sessionState.streamStatus,
        rtmpUrl: RTMP_SERVER_URL,
        cleanupHandlers: sessionState.cleanup.length
      }));

      res.json({
        sessions: sessions,
        timestamp: new Date().toISOString()
      });
    });
  }
}

// Start the server
console.log('Starting RTMP Stream App...');
console.log(`Package: ${PACKAGE_NAME}`);
console.log(`Port: ${PORT}`);
console.log(`RTMP URL: ${RTMP_SERVER_URL}`);
console.log(`Auto Start: ${STREAM_AUTO_START}`);
console.log(`API Key: ${MENTRAOS_API_KEY ? `${MENTRAOS_API_KEY.substring(0, 8)}...` : 'NOT SET'}`);

const app = new VideoStreamApp();

app.start().then(() => {
  console.log('✅ RTMP Stream App server started successfully');
  console.log('📱 Connect your MentraOS glasses to start streaming');
  console.log('🎤 Voice commands: "hey little chef [start/stop] streaming"');
  console.log(`📡 Stream will be sent to: ${RTMP_SERVER_URL}`);
}).catch(error => {
  console.error('❌ Failed to start app server:', error);
  process.exit(1);
});
