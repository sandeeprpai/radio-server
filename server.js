const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Use environment port provided by cloud host (like Render or Railway), or default to 8080
const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

console.log(`Radio WebSocket server running on port ${PORT}`);

wss.on('connection', (ws) => {
    console.log('Android client connected');

    // Send the latest stations.json immediately upon connection
    sendLatestStations(ws);

    // Listen for optional manual refresh messages from the Android app
    ws.on('message', (message) => {
        if (message.toString() === 'GET_STATIONS') {
            console.log('Received GET_STATIONS request from client.');
            sendLatestStations(ws);
        }
    });

    ws.on('close', () => {
        console.log('Android client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error encountered:', error);
    });
});

function sendLatestStations(ws) {
    const filePath = path.join(__dirname, 'stations.json');

    // Check if stations.json exists before reading to prevent crashes
    if (!fs.existsSync(filePath)) {
        console.warn('Warning: stations.json not found on server. Sending empty list.');
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify([]));
        }
        return;
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading stations.json:', err);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify([]));
            }
            return;
        }

        try {
            // Validate JSON format before transmitting to the client
            JSON.parse(data); 
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(data);
                console.log('Successfully broadcasted stations.json to client.');
            }
        } catch (e) {
            console.error('stations.json contains invalid JSON syntax:', e);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify([]));
            }
        }
    });
}
