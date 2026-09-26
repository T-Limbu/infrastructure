/**
 * Siboasi B2202A Bluetooth Low Energy (BLE) Protocol Driver
 * Reverse-engineered from official Siboasi Android APK (com.sbas.mybledemo)
 */

export const SIBOASI_BLE_CONFIG = {
  DEVICE_PREFIX: 'SS-B2202A',
  // Siboasi Primary GATT Service
  SERVICE_UUID: '0000ff12-0000-1000-8000-00805f9b34fb',
  SERVICE_UUID_SHORT: 0xff12,
  // Siboasi Transmit Characteristic (Write Without Response)
  WRITE_CHAR_UUID: '0000ff01-0000-1000-8000-00805f9b34fb',
  WRITE_CHAR_UUID_SHORT: 0xff01,
  // Siboasi Receive / Notify Characteristic (Telemetry)
  NOTIFY_CHAR_UUID: '0000ff02-0000-1000-8000-00805f9b34fb',
  NOTIFY_CHAR_UUID_SHORT: 0xff02,
};

export const SIBOASI_OPCODES = {
  STOP: 0xA0,              // zantingmodel
  PAUSE_RESUME: 0xA0,      // badminton_pause_sj
  FIXED_SHOT: 0xAB,        // badminton_dingdianmodel
  CUSTOM_SEQUENCE: 0xAA,   // badminton_zidingyimodel
  RANDOM: 0xA8,            // badminton_suijimodel
  CROSS_LINE: 0xAF,        // badminton_jiaochamodel
  HORIZONTAL: 0xAD,        // badminton_shuipingmodel
  COMBINATION: 0xA4,       // badminton_zuhemodel
  READ_BATTERY: 0xC1,      // read_Battery
};

/**
 * Builds a raw byte packet according to Siboasi framing rules:
 * Byte 0: 0xEF
 * Byte 1: Total Length (N)
 * Byte 2-3: Random Session Bytes
 * Byte 4-6: 0x04, 0x81, 0x01
 * Byte 7: Payload Length + 1
 * Byte 8: Opcode
 * Byte 9..N-4: Payload Bytes
 * Byte N-3..N-2: 0x00, 0x00
 * Byte N-1: 0xED
 */
export function buildSiboasiPacket(opcode, payloadBytes = []) {
  const totalLen = 8 + 1 + payloadBytes.length + 3;
  const packet = new Uint8Array(totalLen);
  
  packet[0] = 0xEF;
  packet[1] = totalLen;
  packet[2] = Math.floor(Math.random() * 255);
  packet[3] = Math.floor(Math.random() * 255);
  packet[4] = 0x04;
  packet[5] = 0x81;
  packet[6] = 0x01;
  packet[7] = payloadBytes.length + 1;
  packet[8] = opcode;
  
  for (let i = 0; i < payloadBytes.length; i++) {
    packet[9 + i] = payloadBytes[i] & 0xFF;
  }
  
  packet[totalLen - 3] = 0x00;
  packet[totalLen - 2] = 0x00;
  packet[totalLen - 1] = 0xED;
  
  return packet;
}

export function buildStopPacket() {
  return buildSiboasiPacket(SIBOASI_OPCODES.STOP, []);
}

export function buildBatteryQueryPacket() {
  return buildSiboasiPacket(SIBOASI_OPCODES.READ_BATTERY, []);
}

export function buildPauseResumePacket(isPaused = false) {
  return buildSiboasiPacket(SIBOASI_OPCODES.PAUSE_RESUME, [isPaused ? 1 : 0]);
}

export function buildFixedShotPacket(horizontal = 30, vertical = 5, speed = 10, frequency = 3, lift = 1) {
  const comb = Math.abs(vertical * 16 + vertical) % 256;
  return buildSiboasiPacket(SIBOASI_OPCODES.FIXED_SHOT, [horizontal, vertical, comb, speed, frequency, lift]);
}

export function buildRandomPacket(horizontal = 30, vertical = 5, speed = 10, frequency = 3, lift = 1) {
  const comb = Math.abs(vertical * 16 + vertical) % 256;
  return buildSiboasiPacket(SIBOASI_OPCODES.RANDOM, [horizontal, 0xFF, 0xFF, comb, speed, frequency, lift]);
}

export function buildCrossLinePacket(horizontal = 30, vertical = 5, speed = 10, frequency = 3, lift = 1) {
  const comb = Math.abs(vertical * 16 + vertical) % 256;
  return buildSiboasiPacket(SIBOASI_OPCODES.CROSS_LINE, [horizontal, comb, speed, frequency, lift]);
}

export function buildHorizontalPacket(horizontal = 30, vertical = 5, speed = 10, frequency = 3, lift = 1) {
  const comb = Math.abs(vertical * 16 + vertical) % 256;
  return buildSiboasiPacket(SIBOASI_OPCODES.HORIZONTAL, [horizontal, vertical, comb, speed, frequency, lift]);
}

export function buildCombinationPacket(horizontal = 30, vertical = 5, speed = 10, frequency = 3, lift = 1) {
  const comb = Math.abs(vertical * 16 + vertical) % 256;
  return buildSiboasiPacket(SIBOASI_OPCODES.COMBINATION, [horizontal, comb, speed, frequency, lift]);
}

export function buildCustomSequencePacket(speed = 10, horizontal = 30, frequency = 3, lift = 1, vertical = 5, points = [1, 4]) {
  const comb = Math.abs(speed * 16 + horizontal) % 256;
  const payload = [comb, frequency, lift, vertical, ...points];
  return buildSiboasiPacket(SIBOASI_OPCODES.CUSTOM_SEQUENCE, payload);
}

/**
 * High-level Siboasi BLE Client for Web Bluetooth
 */
export class SiboasiBleClient {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.isConnected = false;
    this.batteryLevel = null;
    this.onStatusChange = null;
    this.onTelemetry = null;
  }

  isSupported() {
    return !!(navigator.bluetooth && navigator.bluetooth.requestDevice);
  }

  async connect() {
    if (!this.isSupported()) {
      throw new Error("Web Bluetooth is not supported on this browser. On iPhone, please open this app in Bluefy or WebBLE browser. On Android/PC, use Chrome/Edge.");
    }

    this._updateStatus('scanning', 'Searching for SS-B2202A...');

    // Request Siboasi Device
    this.device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'SS-' },
        { namePrefix: 'SS-B2202A' },
        { namePrefix: 'Siboasi' }
      ],
      optionalServices: [
        SIBOASI_BLE_CONFIG.SERVICE_UUID,
        SIBOASI_BLE_CONFIG.SERVICE_UUID_SHORT
      ]
    });

    this.device.addEventListener('gattserverdisconnected', () => {
      this.isConnected = false;
      this._updateStatus('disconnected', 'Machine disconnected');
    });

    this._updateStatus('connecting', `Connecting to ${this.device.name}...`);
    this.server = await this.device.gatt.connect();

    // Get Primary Service
    try {
      this.service = await this.server.getPrimaryService(SIBOASI_BLE_CONFIG.SERVICE_UUID);
    } catch {
      this.service = await this.server.getPrimaryService(SIBOASI_BLE_CONFIG.SERVICE_UUID_SHORT);
    }

    // Get Write Characteristic
    try {
      this.writeChar = await this.service.getCharacteristic(SIBOASI_BLE_CONFIG.WRITE_CHAR_UUID);
    } catch {
      this.writeChar = await this.service.getCharacteristic(SIBOASI_BLE_CONFIG.WRITE_CHAR_UUID_SHORT);
    }

    // Try listening to Notifications if available
    try {
      this.notifyChar = await this.service.getCharacteristic(SIBOASI_BLE_CONFIG.NOTIFY_CHAR_UUID);
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener('characteristicvaluechanged', (e) => {
        const val = new Uint8Array(e.target.value.buffer);
        // Byte 9 is usually battery level in response to 0xC1
        if (val.length >= 10 && val[8] === 0xC1) {
          this.batteryLevel = val[9];
        }
        if (this.onTelemetry) this.onTelemetry(val);
      });
    } catch (e) {
      console.warn("Telemetry notifications optional:", e);
    }

    this.isConnected = true;
    this._updateStatus('connected', `Connected to ${this.device.name}`);
    
    // Poll battery once connected
    setTimeout(() => this.queryBattery().catch(() => {}), 800);

    return this.device.name;
  }

  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this._updateStatus('disconnected', 'Disconnected');
  }

  async sendPacket(uint8Array) {
    if (!this.isConnected || !this.writeChar) {
      throw new Error("Not connected to machine!");
    }
    if (this.writeChar.writeValueWithoutResponse) {
      await this.writeChar.writeValueWithoutResponse(uint8Array);
    } else {
      await this.writeChar.writeValue(uint8Array);
    }
  }

  async emergencyStop() {
    const pkt = buildStopPacket();
    await this.sendPacket(pkt);
  }

  async queryBattery() {
    const pkt = buildBatteryQueryPacket();
    await this.sendPacket(pkt);
  }

  async sendFixedShot(horizontal, vertical, speed, frequency, lift = 1) {
    const pkt = buildFixedShotPacket(horizontal, vertical, speed, frequency, lift);
    await this.sendPacket(pkt);
  }

  async sendRandom(horizontal, vertical, speed, frequency, lift = 1) {
    const pkt = buildRandomPacket(horizontal, vertical, speed, frequency, lift);
    await this.sendPacket(pkt);
  }

  async sendCrossLine(horizontal, vertical, speed, frequency, lift = 1) {
    const pkt = buildCrossLinePacket(horizontal, vertical, speed, frequency, lift);
    await this.sendPacket(pkt);
  }

  async sendHorizontal(horizontal, vertical, speed, frequency, lift = 1) {
    const pkt = buildHorizontalPacket(horizontal, vertical, speed, frequency, lift);
    await this.sendPacket(pkt);
  }

  async sendCombination(horizontal, vertical, speed, frequency, lift = 1) {
    const pkt = buildCombinationPacket(horizontal, vertical, speed, frequency, lift);
    await this.sendPacket(pkt);
  }

  async sendCustomSequence(speed, horizontal, frequency, lift, vertical, points) {
    const pkt = buildCustomSequencePacket(speed, horizontal, frequency, lift, vertical, points);
    await this.sendPacket(pkt);
  }

  _updateStatus(state, message) {
    if (this.onStatusChange) {
      this.onStatusChange({ 
        state, 
        message, 
        deviceName: this.device ? this.device.name : null,
        battery: this.batteryLevel
      });
    }
  }
}
