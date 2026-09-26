# Siboasi B2202A Court Commander (MVP)

A custom, English-language, court-ready Web Bluetooth app designed specifically for the **Siboasi SS-B2202A** badminton feeding machine.

---

## Why this exists
- **Permanent Drill Memory**: Your custom drills are saved forever in local storage — no more losing settings when you turn off the app!
- **Multi-Step Drill Choreographer**: Automatically sequences shots (e.g. Front Drop $\rightarrow$ Deep Clear $\rightarrow$ Smash) with customizable delays between each shot.
- **100% Clean English UI**: High-contrast, large touch targets designed for quick operation on the court.
- **1-Tap Quick Start**: Open app $\rightarrow$ Tap Connect $\rightarrow$ Tap your drill $\rightarrow$ Start practicing.

---

## Hardware & Protocol Specs (Reverse Engineered)
- **Model**: Siboasi SS-B2202A
- **Primary GATT Service**: `0000FF12-0000-1000-8000-00805F9B34FB` (`0xFF12`)
- **Write Characteristic (TX)**: `0000FF01-0000-1000-8000-00805F9B34FB` (`0xFF01` - Write Without Response)
- **Notify Characteristic (RX)**: `0000FF02-0000-1000-8000-00805F9B34FB` (`0xFF02` - Notify)
- **Framing**: `0xEF [Length] [Rand] [Rand] 0x04 0x81 0x01 [PayloadLen] [Opcode] [Data...] 0x00 0x00 0xED`

---

## How to Run & Use on Court

### On your PC or Laptop:
```bash
python siboasi_badminton_app/serve.py
```
Open Chrome or Edge and go to `http://localhost:8000`.

### On your iPhone:
1. Since standard Safari on iOS blocks Web Bluetooth, install the free browser [**Bluefy - Web BLE Browser**](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) from the App Store.
2. In Bluefy, open the URL where this app is hosted (or your PC's IP address on Wi-Fi: `http://<your-pc-ip>:8000`).
3. Tap **Connect** $\rightarrow$ select your machine (`SS-B2202A`) $\rightarrow$ tap **Start Drill**!

### On Android:
Open directly in **Google Chrome** $\rightarrow$ tap Connect.

---

## Testing Protocol Integrity
Run the included protocol unit test suite:
```bash
python siboasi_badminton_app/test_protocol.py
```
