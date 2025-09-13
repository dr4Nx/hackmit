  const NodeMediaServer = require('node-media-server');

  const config = {
    rtmp: {
      port: 1935,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60
    },
    http: {
      port: 8080,
      allow_origin: '*'
    }
  };

  const nms = new NodeMediaServer(config);
  nms.run();

  console.log('🔴 RTMP Server running on port 1935');
  console.log('🌐 HTTP Server running on port 8080');
  console.log('📡 Stream to: rtmp://localhost:1935/live/cooking');
  console.log('👁️  View at: http://localhost:8080/live/cooking.m3u8');


