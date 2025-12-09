# API Examples

ตัวอย่างการใช้งาน REST API สำหรับจัดการ Uptime Kuma Monitors

## เริ่มต้นใช้งาน

1. ติดตั้ง dependencies:
```bash
npm install
```

2. ตั้งค่า environment variables ในไฟล์ `.env`:
```env
UPTIME_KUMA_URL=http://localhost:3001
UPTIME_KUMA_USER=admin
UPTIME_KUMA_PASS=admin123
PORT=3000
```

3. เริ่มต้น API server:
```bash
npm run api
```

## ตัวอย่างการใช้งาน

### 1. ตรวจสอบสถานะ API

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "success": true,
  "message": "API is running",
  "uptime_kuma_connected": true
}
```

### 2. ดึงรายการ Monitors ทั้งหมด

```bash
curl http://localhost:3000/api/monitors
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
      "interval": 60,
      "active": true
    }
  ]
}
```

### 3. ดึง Monitor ตาม ID

```bash
curl http://localhost:3000/api/monitors/1
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
    "interval": 60,
    "active": true
  }
}
```

### 4. สร้าง Monitor ใหม่

```bash
curl -X POST http://localhost:3000/api/monitors \
  -H "Content-Type: application/json" \
  -d '{
    "type": "http",
    "name": "Example Website",
    "url": "https://example.com",
    "interval": 60,
    "maxretries": 3,
    "method": "GET",
    "active": true,
    "conditions": []
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor created successfully",
  "data": {
    "monitorID": 3
  }
}
```

### 5. แก้ไข Monitor

```bash
curl -X PUT http://localhost:3000/api/monitors/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "interval": 120
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor updated successfully",
  "data": { ... }
}
```

### 6. ลบ Monitor

```bash
curl -X DELETE http://localhost:3000/api/monitors/1
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor deleted successfully"
}
```

### 7. หยุด Monitor (Pause)

```bash
curl -X POST http://localhost:3000/api/monitors/1/pause
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor paused successfully"
}
```

### 8. เปิด Monitor (Resume)

```bash
curl -X POST http://localhost:3000/api/monitors/1/resume
```

**Response:**
```json
{
  "success": true,
  "message": "Monitor resumed successfully"
}
```

## ตัวอย่างการใช้งานด้วย JavaScript

### ใช้ Fetch API

```javascript
// ดึงรายการ monitors
async function getMonitors() {
  const response = await fetch('http://localhost:3000/api/monitors');
  const data = await response.json();
  console.log(data);
  return data;
}

// สร้าง monitor ใหม่
async function createMonitor(monitorData) {
  const response = await fetch('http://localhost:3000/api/monitors', {
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
      conditions: [],
      ...monitorData
    })
  });
  const result = await response.json();
  return result;
}

// แก้ไข monitor
async function updateMonitor(id, updates) {
  const response = await fetch(`http://localhost:3000/api/monitors/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  const result = await response.json();
  return result;
}

// ลบ monitor
async function deleteMonitor(id) {
  const response = await fetch(`http://localhost:3000/api/monitors/${id}`, {
    method: 'DELETE'
  });
  const result = await response.json();
  return result;
}

// ใช้งาน
(async () => {
  // ดึงรายการ monitors
  const monitors = await getMonitors();
  console.log(`Found ${monitors.count} monitors`);

  // สร้าง monitor ใหม่
  const newMonitor = await createMonitor({
    name: 'Google',
    url: 'https://google.com'
  });
  console.log('Created monitor:', newMonitor.data.monitorID);

  // แก้ไข monitor
  await updateMonitor(newMonitor.data.monitorID, {
    interval: 120
  });

  // ลบ monitor
  await deleteMonitor(newMonitor.data.monitorID);
})();
```

### ใช้ Axios

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// ดึงรายการ monitors
async function getMonitors() {
  const response = await axios.get(`${API_BASE_URL}/monitors`);
  return response.data;
}

// สร้าง monitor ใหม่
async function createMonitor(monitorData) {
  const response = await axios.post(`${API_BASE_URL}/monitors`, {
    type: 'http',
    name: 'Example Website',
    url: 'https://example.com',
    interval: 60,
    active: true,
    conditions: [],
    ...monitorData
  });
  return response.data;
}

// แก้ไข monitor
async function updateMonitor(id, updates) {
  const response = await axios.put(`${API_BASE_URL}/monitors/${id}`, updates);
  return response.data;
}

// ลบ monitor
async function deleteMonitor(id) {
  const response = await axios.delete(`${API_BASE_URL}/monitors/${id}`);
  return response.data;
}
```

## ตัวอย่างการใช้งานด้วย Python

```python
import requests

API_BASE_URL = 'http://localhost:3000/api'

# ดึงรายการ monitors
def get_monitors():
    response = requests.get(f'{API_BASE_URL}/monitors')
    return response.json()

# สร้าง monitor ใหม่
def create_monitor(monitor_data):
    payload = {
        'type': 'http',
        'name': 'Example Website',
        'url': 'https://example.com',
        'interval': 60,
        'active': True,
        'conditions': [],
        **monitor_data
    }
    response = requests.post(f'{API_BASE_URL}/monitors', json=payload)
    return response.json()

# แก้ไข monitor
def update_monitor(monitor_id, updates):
    response = requests.put(f'{API_BASE_URL}/monitors/{monitor_id}', json=updates)
    return response.json()

# ลบ monitor
def delete_monitor(monitor_id):
    response = requests.delete(f'{API_BASE_URL}/monitors/{monitor_id}')
    return response.json()

# ใช้งาน
if __name__ == '__main__':
    # ดึงรายการ monitors
    monitors = get_monitors()
    print(f"Found {monitors['count']} monitors")
    
    # สร้าง monitor ใหม่
    new_monitor = create_monitor({
        'name': 'Google',
        'url': 'https://google.com'
    })
    print(f"Created monitor: {new_monitor['data']['monitorID']}")
    
    # แก้ไข monitor
    update_monitor(new_monitor['data']['monitorID'], {
        'interval': 120
    })
    
    # ลบ monitor
    delete_monitor(new_monitor['data']['monitorID'])
```

## Error Handling

API จะส่ง response ในรูปแบบนี้เมื่อเกิด error:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### HTTP Status Codes

- `200 OK` - Request สำเร็จ
- `201 Created` - สร้าง resource ใหม่สำเร็จ
- `400 Bad Request` - Request ไม่ถูกต้อง (เช่น ID ไม่ถูกต้อง)
- `404 Not Found` - ไม่พบ resource
- `500 Internal Server Error` - เกิด error ภายใน server

### ตัวอย่าง Error Response

```json
{
  "success": false,
  "error": "Monitor not found"
}
```

