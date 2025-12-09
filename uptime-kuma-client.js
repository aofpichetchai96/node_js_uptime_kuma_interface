const io = require('socket.io-client');

class UptimeKumaClient {
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.authenticated = false;
    }

    // เชื่อมต่อกับ Uptime Kuma server
    connect() {
        return new Promise((resolve, reject) => {
            this.socket = io(this.url, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                reconnectionAttempts: Infinity
            });

            this.socket.on('connect', () => {
                console.log('✅ Connected to Uptime Kuma');
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error('❌ Connection error:', error.message);
                reject(error);
            });

            this.socket.on('disconnect', () => {
                console.log('🔌 Disconnected from Uptime Kuma');
                this.authenticated = false;
            });

            this.socket.on('info', (data) => {
                console.log('📊 Server info:', data);
            });
        });
    }

    // Login เข้าสู่ระบบ
    login(username, password, token = null) {
        return new Promise((resolve, reject) => {
            const loginData = {
                username,
                password,
                token
            };

            this.socket.emit('login', loginData, (response) => {
                if (response.ok) {
                    console.log('✅ Login successful');
                    this.authenticated = true;
                    resolve(response);
                } else {
                    console.error('❌ Login failed:', response.msg);
                    reject(new Error(response.msg));
                }
            });
        });
    }

    // เพิ่ม monitor ใหม่
    addMonitor(monitorData) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                return reject(new Error('Not authenticated'));
            }

            // Ensure required fields for Uptime Kuma 2.0+
            const data = {
                ...monitorData,
                notificationIDList: monitorData.notificationIDList || [],
                conditions: monitorData.conditions || [],
                // Additional default fields that Uptime Kuma expects
                accepted_statuscodes: monitorData.accepted_statuscodes || ['200-299'],
                dns_resolve_type: monitorData.dns_resolve_type || 'A',
                dns_resolve_server: monitorData.dns_resolve_server || '1.1.1.1',
                proxyId: monitorData.proxyId || null,
                mqttUsername: monitorData.mqttUsername || '',
                mqttPassword: monitorData.mqttPassword || '',
                mqttTopic: monitorData.mqttTopic || '',
                mqttSuccessMessage: monitorData.mqttSuccessMessage || '',
                databaseConnectionString: monitorData.databaseConnectionString || '',
                databaseQuery: monitorData.databaseQuery || '',
                authMethod: monitorData.authMethod || null,
                grpcUrl: monitorData.grpcUrl || '',
                grpcProtobuf: monitorData.grpcProtobuf || '',
                grpcServiceName: monitorData.grpcServiceName || '',
                grpcMethod: monitorData.grpcMethod || '',
                grpcBody: monitorData.grpcBody || '',
                grpcMetadata: monitorData.grpcMetadata || '',
                grpcEnableTls: monitorData.grpcEnableTls || false,
                radiusUsername: monitorData.radiusUsername || '',
                radiusPassword: monitorData.radiusPassword || '',
                radiusSecret: monitorData.radiusSecret || '',
                radiusCalledStationId: monitorData.radiusCalledStationId || '',
                radiusCallingStationId: monitorData.radiusCallingStationId || ''
            };

            this.socket.emit('add', data, (response) => {
                if (response.ok) {
                    console.log('✅ Monitor added successfully:', response.monitorID);
                    resolve(response);
                } else {
                    console.error('❌ Failed to add monitor:', response.msg);
                    reject(new Error(response.msg));
                }
            });
        });
    }

    // ดึงรายการ monitors ทั้งหมด
    getMonitorList() {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                return reject(new Error('Not authenticated'));
            }

            // ตั้งค่า timeout
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Timeout waiting for monitor list'));
            }, 10000);

            let resolved = false;

            // ฟัง event 'monitorList' จาก server
            const monitorListHandler = (monitorList) => {
                if (resolved) return;
                cleanup();
                resolved = true;
                
                if (monitorList && typeof monitorList === 'object' && !Array.isArray(monitorList)) {
                    const count = Object.keys(monitorList).length;
                    console.log(`✅ Retrieved ${count} monitors from event`);
                    resolve(monitorList);
                } else {
                    resolve({});
                }
            };

            const cleanup = () => {
                clearTimeout(timeout);
                if (this.socket) {
                    this.socket.off('monitorList', monitorListHandler);
                }
            };

            // ฟัง event 'monitorList'
            this.socket.once('monitorList', monitorListHandler);

            // ส่ง request
            this.socket.emit('getMonitorList', (response) => {
                if (resolved) return;

                if (!response) {
                    // ไม่มี response แต่รอ event แทน
                    return;
                }
                
                if (response.ok) {
                    // ถ้า response มี monitorList ให้ใช้เลย
                    let monitorList = response.monitorList;
                    
                    if (monitorList && typeof monitorList === 'object' && !Array.isArray(monitorList)) {
                        cleanup();
                        resolved = true;
                        const count = Object.keys(monitorList).length;
                        console.log(`✅ Retrieved ${count} monitors from callback`);
                        resolve(monitorList);
                    } else {
                        // ไม่มี monitorList ใน response ให้รอ event แทน
                        console.log('📋 Waiting for monitorList event...');
                    }
                } else {
                    cleanup();
                    resolved = true;
                    reject(new Error(response.msg || 'Failed to get monitor list'));
                }
            });
        });
    }

    // ดึง monitor ตาม ID
    getMonitor(monitorId) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                return reject(new Error('Not authenticated'));
            }

            this.socket.emit('getMonitor', monitorId, (response) => {
                if (response.ok) {
                    console.log(`✅ Retrieved monitor: ${response.monitor.name}`);
                    resolve(response.monitor);
                } else {
                    reject(new Error(response.msg || 'Failed to get monitor'));
                }
            });
        });
    }

    // แก้ไข monitor
    editMonitor(monitorData) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                return reject(new Error('Not authenticated'));
            }

            this.socket.emit('editMonitor', monitorData, (response) => {
                if (response.ok) {
                    console.log('✅ Monitor updated successfully');
                    resolve(response);
                } else {
                    console.error('❌ Failed to update monitor:', response.msg);
                    reject(new Error(response.msg));
                }
            });
        });
    }

    // ลบ monitor
    deleteMonitor(monitorId) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                return reject(new Error('Not authenticated'));
            }

            this.socket.emit('deleteMonitor', monitorId, (response) => {
                if (response.ok) {
                    console.log('✅ Monitor deleted successfully');
                    resolve(response);
                } else {
                    console.error('❌ Failed to delete monitor:', response.msg);
                    reject(new Error(response.msg));
                }
            });
        });
    }

    // Pause monitor
    pauseMonitor(monitorId) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                return reject(new Error('Not authenticated'));
            }

            this.socket.emit('pauseMonitor', monitorId, (response) => {
                if (response.ok) {
                    console.log('✅ Monitor paused');
                    resolve(response);
                } else {
                    reject(new Error(response.msg || 'Failed to pause monitor'));
                }
            });
        });
    }

    // Resume monitor
    resumeMonitor(monitorId) {
        return new Promise((resolve, reject) => {
            if (!this.authenticated) {
                return reject(new Error('Not authenticated'));
            }

            this.socket.emit('resumeMonitor', monitorId, (response) => {
                if (response.ok) {
                    console.log('✅ Monitor resumed');
                    resolve(response);
                } else {
                    reject(new Error(response.msg || 'Failed to resume monitor'));
                }
            });
        });
    }

    // รับ updates แบบ real-time
    onHeartbeat(callback) {
        this.socket.on('heartbeat', callback);
    }

    onHeartbeatList(callback) {
        this.socket.on('heartbeatList', callback);
    }

    onMonitorList(callback) {
        this.socket.on('monitorList', callback);
    }

    onUptimeList(callback) {
        this.socket.on('uptimeList', callback);
    }

    // ยกเลิก listeners
    removeAllListeners() {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    // ตัดการเชื่อมต่อ
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            console.log('👋 Disconnected');
        }
    }
}

// ตัวอย่างการใช้งาน
async function main() {
    // สร้าง client instance
    const client = new UptimeKumaClient('http://localhost:3001');

    try {
        // เชื่อมต่อ
        await client.connect();

        // Login
        await client.login('admin', 'your-password');

        // เพิ่ม monitor ใหม่
        const newMonitor = await client.addMonitor({
            type: 'http',
            name: 'Google',
            url: 'https://google.com',
            interval: 60,
            maxretries: 3,
            method: 'GET',
            active: true,
            conditions: []          // เงื่อนไขการแจ้งเตือน (required ใน Uptime Kuma 2.0+)
        });
        console.log('Monitor ID:', newMonitor.monitorID);

        // ดึงรายการ monitors
        const monitors = await client.getMonitorList();
        console.log('Monitors:', Object.keys(monitors));

        // ฟัง real-time updates
        client.onHeartbeat((data) => {
            console.log('💓 Heartbeat:', data);
        });

        client.onMonitorList((data) => {
            console.log('📋 Monitor list updated:', Object.keys(data).length);
        });

        // รอสักครู่เพื่อดู updates
        await new Promise(resolve => setTimeout(resolve, 10000));

        // ตัดการเชื่อมต่อ
        client.disconnect();

    } catch (error) {
        console.error('Error:', error.message);
        client.disconnect();
        process.exit(1);
    }
}

// Export สำหรับใช้เป็น module
module.exports = UptimeKumaClient;

// ถ้ารันไฟล์นี้โดยตรง
if (require.main === module) {
    main().catch(console.error);
}
