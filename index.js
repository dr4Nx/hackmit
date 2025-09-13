import pkg from '@mentra/sdk';
const { AppServer } = pkg;
import express from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PACKAGE_NAME = process.env.PACKAGE_NAME ?? (() => { throw new Error('PACKAGE_NAME is not set in .env file'); })();
const MENTRAOS_API_KEY = process.env.MENTRAOS_API_KEY ?? (() => { throw new Error('MENTRAOS_API_KEY is not set in .env file'); })();
const PORT = parseInt(process.env.PORT || '3000');
const RTMP_SERVER_URL = process.env.RTMP_SERVER_URL ?? (() => { throw new Error('RTMP_SERVER_URL is not set in .env file'); })();

class SimpleStreamApp extends AppServer {
  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
      mentraOSWebsocketUrl: 'wss://uscentralapi.mentra.glass/app-ws',
    });
    this.setupRoutes();
    this.currentSession = null;
  }

  async onSession(session, sessionId, userId) {
    console.log(`✅ Session started for user ${userId}`);
    this.currentSession = { session, sessionId, userId };
    
    // Auto-start streaming when glasses connect
    try {
      console.log(`📡 Auto-starting stream to ${RTMP_SERVER_URL}`);
      await session.camera.startStream({
        rtmpUrl: RTMP_SERVER_URL
      });
      console.log(`✅ Stream started successfully`);
    } catch (error) {
      console.error(`❌ Failed to start stream:`, error);
    }

    // Monitor stream status
    session.camera.onStreamStatus(status => {
      console.log(`📡 Stream status: ${status.status}`);
      if (status.status === "active") {
        console.log(`🔴 LIVE: Streaming to ${RTMP_SERVER_URL}`);
      } else if (status.status === "error") {
        console.error(`❌ Stream error: ${status.errorDetails}`);
      }
    });

    session.events.onDisconnected(() => {
      console.log(`📱 Session disconnected for user ${userId}`);
      this.currentSession = null;
    });
  }

  async onStop(sessionId, userId, reason) {
    console.log(`⏹️ Session stopped for user ${userId}, reason: ${reason}`);
    this.currentSession = null;
  }

  setupRoutes() {
    const app = this.getExpressApp();
    
    app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>MentraOS Stream Viewer</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              background: #f5f5f5;
              text-align: center;
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
              color: #333; 
              margin-bottom: 30px;
            }
            .stream-container {
              margin: 20px 0;
              background: #000;
              border-radius: 10px;
              overflow: hidden;
            }
            video {
              width: 100%;
              height: 400px;
              background: #000;
            }
            .status {
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
              font-weight: bold;
            }
            .status.connected { background: #d4edda; color: #155724; }
            .status.disconnected { background: #f8d7da; color: #721c24; }
            .info {
              background: #e8f4fd;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            button {
              background: #007bff;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              margin: 5px;
            }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📡 MentraOS Stream Viewer</h1>
            
            <div class="status disconnected" id="status">
              📱 Waiting for MentraOS glasses connection...
            </div>
            
            <div class="stream-container">
              <video id="streamVideo" controls autoplay muted>
                <source id="streamSource" src="" type="application/x-mpegURL">
                Your browser does not support the video tag or HLS streaming.
              </video>
            </div>
            
            <div class="info">
              <h3>📋 Stream Information</h3>
              <p><strong>RTMP URL:</strong> ${RTMP_SERVER_URL}</p>
              <p><strong>View URL:</strong> <span id="viewUrl">Connect glasses to start streaming</span></p>
              <p><strong>Status:</strong> <span id="streamStatus">Waiting...</span></p>
            </div>

            <div>
              <button onclick="refreshStream()">🔄 Refresh Stream</button>
              <button onclick="testConnection()">🔗 Test Connection</button>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px;">
              <h4>📝 Setup Instructions:</h4>
              <p>1. Make sure RTMP server is running (try: <code>docker run -d -p 8000:1935 -p 8080:8080 tiangolo/nginx-rtmp</code>)</p>
              <p>2. Connect your MentraOS glasses</p>
              <p>3. Stream should auto-start and appear above</p>
            </div>
          </div>

          <script>
            const streamVideo = document.getElementById('streamVideo');
            const streamSource = document.getElementById('streamSource');
            const status = document.getElementById('status');
            const viewUrl = document.getElementById('viewUrl');
            const streamStatus = document.getElementById('streamStatus');

            // Try to load HLS stream
            function loadStream() {
              // Assuming standard nginx-rtmp setup
              const hlsUrl = '${RTMP_SERVER_URL}'.replace('rtmp:', 'http:').replace(':8000', ':8080') + '.m3u8';
              
              console.log('Trying to load stream from:', hlsUrl);
              streamSource.src = hlsUrl;
              streamVideo.load();
              viewUrl.textContent = hlsUrl;
              
              // Update status
              status.textContent = '📡 Attempting to load stream...';
              status.className = 'status connected';
              streamStatus.textContent = 'Loading...';
            }

            function refreshStream() {
              console.log('Refreshing stream...');
              loadStream();
            }

            function testConnection() {
              fetch('/api/status')
                .then(response => response.json())
                .then(data => {
                  console.log('Status:', data);
                  if (data.hasSession) {
                    status.textContent = '✅ MentraOS glasses connected and streaming';
                    status.className = 'status connected';
                    streamStatus.textContent = 'Active';
                    loadStream();
                  } else {
                    status.textContent = '📱 No MentraOS glasses connected';
                    status.className = 'status disconnected';
                    streamStatus.textContent = 'Waiting for connection';
                  }
                })
                .catch(error => {
                  console.error('Connection test failed:', error);
                  streamStatus.textContent = 'Connection test failed';
                });
            }

            // Auto-refresh every 5 seconds
            setInterval(() => {
              testConnection();
            }, 5000);

            // Initial load
            testConnection();
            loadStream();
          </script>
        </body>
        </html>
      `);
    });

    app.get('/api/status', (req, res) => {
      res.json({
        hasSession: this.currentSession !== null,
        rtmpUrl: RTMP_SERVER_URL,
        sessionInfo: this.currentSession ? {
          sessionId: this.currentSession.sessionId,
          userId: this.currentSession.userId
        } : null
      });
    });

    app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Simple MentraOS Stream App is running',
        rtmpUrl: RTMP_SERVER_URL
      });
    });
  }
}

// Start the server
console.log('🚀 Starting Simple Stream App...');
console.log(`📦 Package: ${PACKAGE_NAME}`);
console.log(`🔌 Port: ${PORT}`);
console.log(`📡 RTMP URL: ${RTMP_SERVER_URL}`);

const app = new SimpleStreamApp();

app.start().then(() => {
  console.log('✅ Simple Stream App started successfully');
  console.log('📱 Connect your MentraOS glasses - streaming will auto-start');
  console.log(`🌐 Open browser: http://localhost:${PORT}`);
  console.log(`📡 Stream will be sent to: ${RTMP_SERVER_URL}`);
}).catch(error => {
  console.error('❌ Failed to start app:', error);
  process.exit(1);
});