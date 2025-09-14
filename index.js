import pkg from '@mentra/sdk';
const { AppServer } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');
const RTMP_SERVER_URL = process.env.RTMP_SERVER_URL ?? (() => { throw new Error('RTMP_SERVER_URL is not set in .env file'); })();

class RTMPStreamApp extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      mentraOSWebsocketUrl: 'wss://uscentralapi.mentra.glass/app-ws',
    });
    
    this.activeSession = null;
    this.streamStatus = null;
    this.setupWebInterface();
  }

  async onSession(session, sessionId, userId) {
    console.log(`[Session] User ${userId} connected (Session: ${sessionId})`);
    
    this.activeSession = {
      session,
      sessionId,
      userId,
      isStreaming: false
    };

    // Monitor stream status changes
    const streamStatusCleanup = session.camera.onStreamStatus((status) => {
      console.log(`[Stream Status] ${status.status}`);
      this.streamStatus = status;
      
      if (status.status === 'streaming') {
        console.log(`[Stream] Active - URL: ${session.camera.getCurrentStreamUrl()}`);
        this.activeSession.isStreaming = true;
      } else if (status.status === 'error') {
        console.error(`[Stream Error] ${status.errorMessage || 'Unknown error'}`);
        this.activeSession.isStreaming = false;
      } else if (status.status === 'stopped') {
        console.log(`[Stream] Stopped`);
        this.activeSession.isStreaming = false;
      }
    });

    // Handle disconnection
    session.events.onDisconnected(() => {
      console.log(`[Session] User ${userId} disconnected`);
      streamStatusCleanup();
      this.activeSession = null;
      this.streamStatus = null;
    });

    // Auto-start streaming
    console.log(`[Stream] Starting stream to ${RTMP_SERVER_URL}`);
    try {
      await session.camera.startStream({
        rtmpUrl: RTMP_SERVER_URL
      });
      console.log(`[Stream] Start command sent successfully`);
    } catch (error) {
      console.error(`[Stream] Failed to start:`, error.message);
    }
  }

  async onStop(sessionId, userId, reason) {
    console.log(`[Session] Stopped - User: ${userId}, Reason: ${reason}`);
    this.activeSession = null;
    this.streamStatus = null;
  }

  setupWebInterface() {
    const app = this.getExpressApp();

    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MentraOS RTMP Stream</title>
            <style>
                body { 
                    font-family: system-ui, -apple-system, sans-serif; 
                    margin: 0; 
                    padding: 20px; 
                    background: #f8fafc;
                }
                .container { 
                    max-width: 900px; 
                    margin: 0 auto; 
                    background: white; 
                    padding: 30px; 
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                }
                h1 { 
                    color: #1a202c; 
                    margin-bottom: 30px;
                    text-align: center;
                }
                .status-card {
                    padding: 20px;
                    border-radius: 8px;
                    margin: 20px 0;
                    border-left: 4px solid;
                }
                .status-connected { 
                    background: #f0fff4; 
                    border-color: #38a169; 
                    color: #22543d; 
                }
                .status-disconnected { 
                    background: #fed7d7; 
                    border-color: #e53e3e; 
                    color: #742a2a; 
                }
                .status-streaming { 
                    background: #e6fffa; 
                    border-color: #319795; 
                    color: #234e52; 
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin: 30px 0;
                }
                .info-item {
                    background: #f7fafc;
                    padding: 15px;
                    border-radius: 8px;
                }
                .info-label {
                    font-weight: 600;
                    color: #4a5568;
                    margin-bottom: 5px;
                }
                .info-value {
                    color: #2d3748;
                    font-family: 'SF Mono', Monaco, monospace;
                    word-break: break-all;
                }
                .stream-controls {
                    text-align: center;
                    margin: 30px 0;
                }
                button {
                    background: #4299e1;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    margin: 8px;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                button:hover { background: #3182ce; }
                button:disabled { 
                    background: #cbd5e0; 
                    cursor: not-allowed; 
                }
                .logs {
                    background: #1a202c;
                    color: #e2e8f0;
                    padding: 20px;
                    border-radius: 8px;
                    font-family: 'SF Mono', Monaco, monospace;
                    font-size: 14px;
                    max-height: 300px;
                    overflow-y: auto;
                    margin-top: 30px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>📡 MentraOS RTMP Streaming</h1>
                
                <div id="sessionStatus" class="status-card status-disconnected">
                    <strong>Session Status:</strong> <span id="sessionText">No glasses connected</span>
                </div>

                <div id="streamStatus" class="status-card status-disconnected">
                    <strong>Stream Status:</strong> <span id="streamText">Not streaming</span>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">RTMP Endpoint</div>
                        <div class="info-value">${RTMP_SERVER_URL}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Stream Key</div>
                        <div class="info-value">${RTMP_SERVER_URL.split('/').pop()}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Server Port</div>
                        <div class="info-value">${PORT}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Last Updated</div>
                        <div class="info-value" id="lastUpdate">Never</div>
                    </div>
                </div>

                <div class="stream-controls">
                    <button onclick="startStream()" id="startBtn" disabled>▶️ Start Stream</button>
                    <button onclick="stopStream()" id="stopBtn" disabled>⏹️ Stop Stream</button>
                    <button onclick="checkStatus()">🔄 Refresh Status</button>
                    <button onclick="verifyStream()">👁️ Verify Stream Exists</button>
                </div>

                <div class="logs" id="logs">
                    <div>Waiting for status updates...</div>
                </div>
            </div>

            <script>
                let pollInterval;
                
                function addLog(message) {
                    const logs = document.getElementById('logs');
                    const time = new Date().toLocaleTimeString();
                    logs.innerHTML += '<div>[' + time + '] ' + message + '</div>';
                    logs.scrollTop = logs.scrollHeight;
                }

                function updateStatus(data) {
                    document.getElementById('lastUpdate').textContent = new Date().toLocaleString();
                    
                    const sessionCard = document.getElementById('sessionStatus');
                    const sessionText = document.getElementById('sessionText');
                    const streamCard = document.getElementById('streamStatus');
                    const streamText = document.getElementById('streamText');
                    const startBtn = document.getElementById('startBtn');
                    const stopBtn = document.getElementById('stopBtn');

                    if (data.hasSession) {
                        sessionCard.className = 'status-card status-connected';
                        sessionText.textContent = 'Glasses connected - User: ' + (data.session?.userId || 'Unknown');
                        startBtn.disabled = false;
                        addLog('✅ Glasses connected: ' + (data.session?.userId || 'Unknown'));
                    } else {
                        sessionCard.className = 'status-card status-disconnected';
                        sessionText.textContent = 'No glasses connected';
                        startBtn.disabled = true;
                        stopBtn.disabled = true;
                        addLog('❌ No glasses connected');
                    }

                    if (data.streamStatus) {
                        if (data.streamStatus.status === 'streaming') {
                            streamCard.className = 'status-card status-streaming';
                            streamText.textContent = 'Streaming active to ' + data.rtmpUrl;
                            startBtn.disabled = true;
                            stopBtn.disabled = false;
                            addLog('🔴 Stream active');
                        } else if (data.streamStatus.status === 'error') {
                            streamCard.className = 'status-card status-disconnected';
                            streamText.textContent = 'Stream error: ' + (data.streamStatus.errorMessage || 'Unknown error');
                            startBtn.disabled = false;
                            stopBtn.disabled = true;
                            addLog('❌ Stream error: ' + (data.streamStatus.errorMessage || 'Unknown'));
                        } else {
                            streamCard.className = 'status-card status-disconnected';
                            streamText.textContent = 'Stream stopped';
                            startBtn.disabled = data.hasSession ? false : true;
                            stopBtn.disabled = true;
                            addLog('⏹️ Stream stopped');
                        }
                    } else {
                        streamCard.className = 'status-card status-disconnected';
                        streamText.textContent = 'Not streaming';
                        startBtn.disabled = data.hasSession ? false : true;
                        stopBtn.disabled = true;
                    }
                }

                function checkStatus() {
                    fetch('/api/status')
                        .then(response => response.json())
                        .then(updateStatus)
                        .catch(error => {
                            addLog('❌ Status check failed: ' + error.message);
                        });
                }

                function startStream() {
                    addLog('▶️ Starting stream...');
                    fetch('/api/stream/start', { method: 'POST' })
                        .then(response => response.json())
                        .then(data => {
                            addLog('📡 Start stream result: ' + data.message);
                            checkStatus();
                        })
                        .catch(error => {
                            addLog('❌ Start stream failed: ' + error.message);
                        });
                }

                function stopStream() {
                    addLog('⏹️ Stopping stream...');
                    fetch('/api/stream/stop', { method: 'POST' })
                        .then(response => response.json())
                        .then(data => {
                            addLog('⏹️ Stop stream result: ' + data.message);
                            checkStatus();
                        })
                        .catch(error => {
                            addLog('❌ Stop stream failed: ' + error.message);
                        });
                }

                function verifyStream() {
                    addLog('👁️ Verifying stream exists...');
                    fetch('/api/stream/verify')
                        .then(response => response.json())
                        .then(data => {
                            if (data.exists) {
                                addLog('✅ Stream exists and is receivable!');
                                if (data.hlsUrl) {
                                    addLog('📺 HLS URL: ' + data.hlsUrl);
                                }
                                if (data.activeStreams) {
                                    addLog('📊 Active streams: ' + Object.keys(data.activeStreams).join(', '));
                                }
                            } else {
                                addLog('❌ Stream not found on server');
                                if (data.error) {
                                    addLog('🔍 Error: ' + data.error);
                                }
                                addLog('💡 Make sure RTMP server is running and receiving the stream');
                            }
                        })
                        .catch(error => {
                            addLog('❌ Stream verification failed: ' + error.message);
                        });
                }

                // Start polling
                checkStatus();
                pollInterval = setInterval(checkStatus, 3000);
                addLog('🚀 Interface loaded');
            </script>
        </body>
        </html>
      `);
    });

    app.get('/api/status', (req, res) => {
      res.json({
        hasSession: this.activeSession !== null,
        rtmpUrl: RTMP_SERVER_URL,
        session: this.activeSession ? {
          userId: this.activeSession.userId,
          sessionId: this.activeSession.sessionId,
          isStreaming: this.activeSession.isStreaming
        } : null,
        streamStatus: this.streamStatus
      });
    });

    app.post('/api/stream/start', async (req, res) => {
      if (!this.activeSession) {
        return res.status(400).json({ 
          success: false,
          message: 'No active session - connect glasses first' 
        });
      }

      try {
        await this.activeSession.session.camera.startStream({
          rtmpUrl: RTMP_SERVER_URL
        });
        res.json({ 
          success: true,
          message: 'Stream start command sent' 
        });
      } catch (error) {
        res.status(500).json({ 
          success: false,
          message: 'Failed to start stream: ' + error.message 
        });
      }
    });

    app.post('/api/stream/stop', async (req, res) => {
      if (!this.activeSession) {
        return res.status(400).json({ 
          success: false,
          message: 'No active session' 
        });
      }

      try {
        await this.activeSession.session.camera.stopStream();
        res.json({ 
          success: true,
          message: 'Stream stop command sent' 
        });
      } catch (error) {
        res.status(500).json({ 
          success: false,
          message: 'Failed to stop stream: ' + error.message 
        });
      }
    });

    app.get('/api/stream/verify', async (req, res) => {
      try {
        // Extract server details from RTMP URL
        const rtmpUrl = new URL(RTMP_SERVER_URL.replace('rtmp:', 'http:'));
        const streamPath = rtmpUrl.pathname; // e.g. "/live/cooking"
        
        // Check if Node Media Server stats endpoint exists
        const statsUrl = `http://${rtmpUrl.hostname}:8080/api/streams`;
        
        const response = await fetch(statsUrl);
        if (response.ok) {
          const streams = await response.json();
          const streamExists = Object.keys(streams).some(key => key.includes(streamPath.replace('/', '')));
          
          res.json({
            exists: streamExists,
            streamPath: streamPath,
            statsUrl: statsUrl,
            activeStreams: streams
          });
        } else {
          // Fallback: try to HEAD request the HLS endpoint
          const hlsUrl = `http://${rtmpUrl.hostname}:8080${streamPath}.m3u8`;
          const hlsResponse = await fetch(hlsUrl, { method: 'HEAD' });
          
          res.json({
            exists: hlsResponse.ok,
            streamPath: streamPath,
            hlsUrl: hlsUrl,
            method: 'HLS head check'
          });
        }
      } catch (error) {
        res.json({
          exists: false,
          error: error.message,
          rtmpUrl: RTMP_SERVER_URL
        });
      }
    });

    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        rtmpUrl: RTMP_SERVER_URL 
      });
    });
  }
}

console.log('🚀 Starting MentraOS RTMP Stream App');
console.log(`📦 Package: ${PACKAGE_NAME}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`📡 RTMP URL: ${RTMP_SERVER_URL}`);

const app = new RTMPStreamApp();

app.start().then(() => {
  console.log('✅ RTMP Stream App running successfully');
  console.log(`🌐 Web Interface: http://localhost:${PORT}`);
  console.log(`📡 Streaming to: ${RTMP_SERVER_URL}`);
  console.log('📱 Connect your MentraOS glasses to begin streaming');
}).catch(error => {
  console.error('❌ Failed to start app:', error);
  process.exit(1);
});