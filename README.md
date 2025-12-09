# Uptime Kuma Node.js Client

Node.js client สำหรับเชื่อมต่อและจัดการ Uptime Kuma ผ่าน Socket.IO API

## 📋 สารบัญ

- [คุณสมบัติ](#คุณสมบัติ)
- [ติดตั้ง](#ติดตั้ง)
- [การใช้งานพื้นฐาน](#การใช้งานพื้นฐาน)
- [REST API Server](#rest-api-server)
- [API Reference](#api-reference)
- [ตัวอย่างการใช้งาน](#ตัวอย่างการใช้งาน)
- [Monitor Types](#monitor-types)

## ✨ คุณสมบัติ

- ✅ เชื่อมต่อกับ Uptime Kuma ผ่าน Socket.IO
- ✅ Authentication (Login/Logout)
- ✅ จัดการ Monitors (CRUD operations)
- ✅ Real-time monitoring updates
- ✅ Pause/Resume monitors
- ✅ รับข้อมูล heartbeat และ uptime แบบ real-time
- ✅ Promise-based API ใช้งานง่าย
- ✅ รองรับ TypeScript (ถ้าเพิ่ม type definitions)

## 📦 ติดตั้ง

### 1. ติดตั้ง Dependencies

```bash
npm install socket.io-client
```

หรือใช้ `package.json` ที่มาพร้อมกับโปรเจค:

```bash
npm install
```

### 2. ตรวจสอบว่า Uptime Kuma กำลังรันอยู่

ตรวจสอบว่า Uptime Kuma server ของคุณกำลังรันอยู่ที่ `http://localhost:3001` หรือ URL อื่นที่คุณกำหนด

## 🚀 การใช้งานพื้นฐาน

### ตัวอย่างแบบง่าย

```javascript
const UptimeKumaClient = require('./uptime-kuma-client');

async function main() {
    // สร้าง client instance
    const client = new UptimeKumaClient('http://localhost:3001');

    try {
        // เชื่อมต่อและ login
        await client.connect();
        await client.login('admin', 'your-password');

        // เพิ่ม monitor
        const monitor = await client.addMonitor({
            type: 'http',
            name: 'My Website',
            url: 'https://example.com',
            interval: 60,
            active: true,
            conditions: []          // เงื่อนไขการแจ้งเตือน (required ใน Uptime Kuma 2.0+)
        });

        console.log('Monitor created:', monitor.monitorID);

        // ดึงรายการ monitors
        const monitors = await client.getMonitorList();
        console.log('Total monitors:', Object.keys(monitors).length);

        // ตัดการเชื่อมต่อ
        client.disconnect();

    } catch (error) {
        console.error('Error:', error);
        client.disconnect();
    }
}

main();
```

### ใช้ Environment Variables

สร้างไฟล์ `.env`:

```env
UPTIME_KUMA_URL=http://localhost:3001
UPTIME_KUMA_USER=admin
UPTIME_KUMA_PASS=your-password
```

จากนั้นใช้กับโค้ด:

```javascript
require('dotenv').config();

const client = new UptimeKumaClient(process.env.UPTIME_KUMA_URL);
await client.login(
    process.env.UPTIME_KUMA_USER, 
    process.env.UPTIME_KUMA_PASS
);
```

## 🌐 REST API Server

โปรเจคนี้มี REST API Server สำหรับจัดการ monitors ผ่าน HTTP endpoints

### ติดตั้ง Dependencies สำหรับ API Server

```bash
npm install express dotenv cors
```

### กำหนดค่า Environment Variables

สร้างไฟล์ `.env`:

```env
UPTIME_KUMA_URL=http://localhost:3001
UPTIME_KUMA_USER=admin
UPTIME_KUMA_PASS=admin123
PORT=3000
```

### เริ่มต้น API Server

```bash
npm run api
```

หรือ

```bash
node api.js
```

Server จะรันที่ `http://localhost:3000` (หรือ port ที่กำหนดใน `.env`)

### API Endpoints

#### Health Check

```http
GET /health
```

ตรวจสอบสถานะ API server

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "uptime_kuma_connected": true
}
```

#### ดึงรายการ Monitors ทั้งหมด

```http
GET /api/monitors
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Google",
      "type": "http",
      "url": "https://google.com",
      "active": true,
      ...
    },
    {
      "id": 2,
      "name": "GitHub",
      "type": "http",
      "url": "https://github.com",
      "active": true,
      ...
    }
  ]
}
```

#### ดึง Monitor ตาม ID

```http
GET /api/monitors/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Google",
    "type": "http",
    "url": "https://google.com",
    "active": true,
    ...
  }
}
```

#### สร้าง Monitor ใหม่

```http
POST /api/monitors
Content-Type: application/json

{
  "type": "http",
  "name": "Example Website",
  "url": "https://example.com",
  "interval": 60,
  "maxretries": 3,
  "method": "GET",
  "active": true,
  "conditions": []
}
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor created successfully",
  "data": {
    "monitorID": 3,
    ...
  }
}
```

#### แก้ไข Monitor

```http
PUT /api/monitors/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "url": "https://new-url.com",
  "interval": 120
}
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor updated successfully",
  "data": { ... }
}
```

#### ลบ Monitor

```http
DELETE /api/monitors/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor deleted successfully"
}
```

#### หยุด Monitor (Pause)

```http
POST /api/monitors/:id/pause
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor paused successfully"
}
```

#### เปิด Monitor (Resume)

```http
POST /api/monitors/:id/resume
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor resumed successfully"
}
```

### ตัวอย่างการใช้งาน API

#### ใช้ cURL

```bash
# ดึงรายการ monitors
curl http://localhost:3000/api/monitors

# สร้าง monitor ใหม่
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -d '{
    "type": "http",
    "name": "Google",
    "url": "https://google.com",
    "interval": 60,
    "active": true,
    "conditions": []
  }'

# แก้ไข monitor
curl -X PUT http://localhost:3000/api/monitors/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name"
  }'

# ลบ monitor
curl -X DELETE http://localhost:3000/api/monitors/1
```

#### ใช้ JavaScript (fetch)

```javascript
// ดึงรายการ monitors
const response = await fetch('http://localhost:3000/api/monitors');
const data = await response.json();
console.log(data);

// สร้าง monitor ใหม่
const newMonitor = await fetch('http://localhost:3000/api/monitors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'http',
    name: 'Example Website',
    url: 'https://example.com',
    interval: 60,
    active: true,
    conditions: []
  })
});
const result = await newMonitor.json();
console.log(result);
```

## 📚 API Reference

### Constructor

```javascript
const client = new UptimeKumaClient(url)
```

- `url` (string): URL ของ Uptime Kuma server (เช่น `http://localhost:3001`)

### Methods

#### `connect()`

เชื่อมต่อกับ Uptime Kuma server

```javascript
await client.connect();
```

#### `login(username, password, token?)`

Login เข้าสู่ระบบ

```javascript
await client.login('admin', 'password');
// หรือใช้ token
await client.login('admin', 'password', '2fa-token');
```

#### `addMonitor(monitorData)`

เพิ่ม monitor ใหม่

```javascript
const result = await client.addMonitor({
    type: 'http',              // ประเภท monitor
    name: 'My Website',        // ชื่อ
    url: 'https://example.com', // URL ที่ต้องการตรวจสอบ
    interval: 60,              // ช่วงเวลาตรวจสอบ (วินาที)
    maxretries: 3,             // จำนวนครั้งที่ retry
    retryInterval: 60,         // ช่วงเวลาระหว่าง retry (วินาที)
    method: 'GET',             // HTTP method
    active: true,              // เปิดใช้งาน
    accepted_statuscodes: ['200-299'], // status code ที่ยอมรับ
    maxredirects: 10,          // จำนวน redirect สูงสุด
    conditions: []             // เงื่อนไขการแจ้งเตือน (required ใน Uptime Kuma 2.0+)
});

console.log('Monitor ID:', result.monitorID);
```

**หมายเหตุ:** สำหรับ Uptime Kuma เวอร์ชัน 2.0 หรือสูงกว่า ฟิลด์ `conditions` เป็น required field และต้องเป็น array (สามารถเป็น array ว่าง `[]` ได้)

#### `getMonitorList()`

ดึงรายการ monitors ทั้งหมด

```javascript
const monitors = await client.getMonitorList();

for (const [id, monitor] of Object.entries(monitors)) {
    console.log(`${id}: ${monitor.name} - ${monitor.url}`);
}
```

#### `getMonitor(monitorId)`

ดึงข้อมูล monitor ตาม ID

```javascript
const monitor = await client.getMonitor(1);
console.log('Name:', monitor.name);
console.log('URL:', monitor.url);
console.log('Active:', monitor.active);
```

#### `editMonitor(monitorData)`

แก้ไข monitor ที่มีอยู่

```javascript
await client.editMonitor({
    id: 1,
    name: 'Updated Name',
    url: 'https://new-url.com',
    interval: 120
});
```

#### `deleteMonitor(monitorId)`

ลบ monitor

```javascript
await client.deleteMonitor(1);
```

#### `pauseMonitor(monitorId)`

หยุด monitor ชั่วคราว

```javascript
await client.pauseMonitor(1);
```

#### `resumeMonitor(monitorId)`

เปิดใช้งาน monitor อีกครั้ง

```javascript
await client.resumeMonitor(1);
```

### Real-time Events

#### `onHeartbeat(callback)`

รับ heartbeat updates แบบ real-time

```javascript
client.onHeartbeat((data) => {
    console.log('Monitor:', data.monitorID);
    console.log('Status:', data.status); // 0 = down, 1 = up
    console.log('Ping:', data.ping, 'ms');
    console.log('Time:', data.time);
});
```

#### `onHeartbeatList(callback)`

รับรายการ heartbeats

```javascript
client.onHeartbeatList((monitorId, data) => {
    console.log('Monitor', monitorId, 'heartbeats:', data);
});
```

#### `onMonitorList(callback)`

รับ updates เมื่อมีการเปลี่ยนแปลงรายการ monitors

```javascript
client.onMonitorList((data) => {
    console.log('Monitor list updated:', Object.keys(data).length, 'monitors');
});
```

#### `onUptimeList(callback)`

รับข้อมูล uptime percentage

```javascript
client.onUptimeList((data) => {
    for (const [key, uptime] of Object.entries(data)) {
        console.log(`${key}: ${(uptime * 100).toFixed(2)}% uptime`);
    }
});
```

#### `removeAllListeners()`

ยกเลิก listeners ทั้งหมด

```javascript
client.removeAllListeners();
```

#### `disconnect()`

ตัดการเชื่อมต่อ

```javascript
client.disconnect();
```

## 💡 ตัวอย่างการใช้งาน

### ตัวอย่างที่ 1: เพิ่ม HTTP Monitor

```javascript
const monitor = await client.addMonitor({
    type: 'http',
    name: 'Google',
    url: 'https://google.com',
    interval: 60,
    maxretries: 3,
    method: 'GET',
    active: true,
    conditions: []          // เงื่อนไขการแจ้งเตือน (required ใน Uptime Kuma 2.0+)
});
```

### ตัวอย่างที่ 2: เพิ่ม Ping Monitor

```javascript
const monitor = await client.addMonitor({
    type: 'ping',
    name: 'DNS Server',
    hostname: '8.8.8.8',
    interval: 60,
    active: true
});
```

### ตัวอย่างที่ 3: เพิ่ม TCP Monitor

```javascript
const monitor = await client.addMonitor({
    type: 'port',
    name: 'SSH Server',
    hostname: 'example.com',
    port: 22,
    interval: 60,
    active: true
});
```

### ตัวอย่างที่ 4: Real-time Monitoring

```javascript
// เริ่มฟัง events
client.onHeartbeat((data) => {
    const status = data.status === 1 ? '✅ UP' : '❌ DOWN';
    console.log(`[${data.monitorID}] ${status} - ${data.ping}ms`);
});

client.onUptimeList((data) => {
    console.log('Uptime data:', data);
});

// ปล่อยให้รันต่อไป...
// ตัด connection เมื่อเสร็จสิ้น
```

### ตัวอย่างที่ 5: Batch Operations

```javascript
const websites = [
    { name: 'Google', url: 'https://google.com' },
    { name: 'GitHub', url: 'https://github.com' },
    { name: 'YouTube', url: 'https://youtube.com' }
];

// เพิ่มหลาย monitors พร้อมกัน
for (const site of websites) {
    await client.addMonitor({
        type: 'http',
        name: site.name,
        url: site.url,
        interval: 60,
        active: true,
        conditions: []          // เงื่อนไขการแจ้งเตือน (required ใน Uptime Kuma 2.0+)
    });
    console.log(`Added ${site.name}`);
}
```

### ตัวอย่างที่ 6: Error Handling

```javascript
try {
    const monitor = await client.addMonitor({
        type: 'http',
        name: 'Test',
        url: 'invalid-url', // URL ผิด
        interval: 60,
        conditions: []          // เงื่อนไขการแจ้งเตือน (required ใน Uptime Kuma 2.0+)
    });
} catch (error) {
    if (error.message.includes('Invalid URL')) {
        console.error('URL ไม่ถูกต้อง');
    } else {
        console.error('เกิดข้อผิดพลาด:', error.message);
    }
}
```

## 🔍 Monitor Types

Uptime Kuma รองรับ monitor หลายประเภท:

### HTTP(s)
```javascript
{
    type: 'http',
    url: 'https://example.com',
    method: 'GET', // GET, POST, PUT, PATCH, DELETE
    headers: null, // Custom headers
    body: null,    // Request body (สำหรับ POST/PUT)
    accepted_statuscodes: ['200-299']
}
```

### Ping
```javascript
{
    type: 'ping',
    hostname: '8.8.8.8'
}
```

### TCP Port
```javascript
{
    type: 'port',
    hostname: 'example.com',
    port: 22
}
```

### DNS
```javascript
{
    type: 'dns',
    hostname: 'example.com',
    dns_resolve_server: '8.8.8.8',
    dns_resolve_type: 'A' // A, AAAA, MX, TXT, etc.
}
```

### Push
```javascript
{
    type: 'push',
    pushToken: 'generated-token' // จะได้รับจาก Uptime Kuma
}
```

### Keyword
```javascript
{
    type: 'keyword',
    url: 'https://example.com',
    keyword: 'search-text'
}
```

## 🔧 การใช้งานตัวอย่างที่มาพร้อม

รัน basic example:

```bash
node examples/basic-usage.js
```

รัน advanced example:

```bash
node examples/basic-usage.js advanced
```

## 🛠️ Troubleshooting

### ไม่สามารถเชื่อมต่อได้

1. ตรวจสอบว่า Uptime Kuma server กำลังรันอยู่
2. ตรวจสอบ URL และ port ที่ถูกต้อง
3. ตรวจสอบ firewall settings

### Authentication Failed

1. ตรวจสอบ username และ password
2. ถ้าใช้ 2FA ต้องส่ง token ด้วย

### Connection Timeout

ปรับค่า timeout ใน constructor:

```javascript
const client = new UptimeKumaClient('http://localhost:3001');
// จากนั้นปรับใน socket.io options (แก้ไขใน constructor)
```

## 📝 หมายเหตุ

- ตรวจสอบให้แน่ใจว่า Uptime Kuma server รองรับ Socket.IO API
- การใช้งาน real-time events จะใช้ WebSocket connection ซึ่งอาจมีปัญหากับ reverse proxy บางตัว
- ควรจัดการ error และ reconnection ในแอปพลิเคชันจริง

## 📖 เอกสารเพิ่มเติม

- [Uptime Kuma Official Documentation](https://github.com/louislam/uptime-kuma)
- [Uptime Kuma API Wiki](https://github.com/louislam/uptime-kuma/wiki/API-Documentation)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)

## 📄 License

MIT License

## 🤝 Contributing

Pull requests are welcome!

---

สร้างโดยใช้ Socket.IO และ Uptime Kuma API
