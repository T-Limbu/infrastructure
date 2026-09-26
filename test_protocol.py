"""Unit tests verifying the reverse-engineered Siboasi B2202A BLE protocol."""

import unittest
import struct

def build_siboasi_packet(opcode: int, payload_bytes: list) -> bytes:
    """Constructs a Siboasi BLE packet matching the decompiled Lcom/sbas/utils/Utils implementation.
    
    Structure:
    Byte 0: 0xEF (-17)
    Byte 1: Total length (N)
    Byte 2: Random token byte
    Byte 3: Random token byte
    Byte 4: 0x04
    Byte 5: 0x81 (-127)
    Byte 6: 0x01
    Byte 7: Payload length
    Byte 8: Opcode
    Byte 9..N-4: Payload parameters
    Byte N-3: 0x00
    Byte N-2: 0x00
    Byte N-1: 0xED (-19)
    """
    total_len = 8 + 1 + len(payload_bytes) + 3
    packet = bytearray(total_len)
    packet[0] = 0xEF
    packet[1] = total_len
    packet[2] = 0x12  # Deterministic test token
    packet[3] = 0x34
    packet[4] = 0x04
    packet[5] = 0x81
    packet[6] = 0x01
    packet[7] = len(payload_bytes) + 1  # includes opcode
    packet[8] = opcode
    for idx, b in enumerate(payload_bytes):
        packet[9 + idx] = b & 0xFF
    packet[total_len - 3] = 0x00
    packet[total_len - 2] = 0x00
    packet[total_len - 1] = 0xED
    return bytes(packet)

def build_stop_packet() -> bytes:
    """Opcode 0xA0: Stop / Emergency Halt."""
    return build_siboasi_packet(0xA0, [])

def build_battery_packet() -> bytes:
    """Opcode 0xC1: Read Battery percentage."""
    return build_siboasi_packet(0xC1, [])

def build_fixed_shot_packet(sp: int, cz: int, sd: int, pl: int, sj: int) -> bytes:
    """Opcode 0xAB: Single point shot with speed, elevation, angle, frequency."""
    comb = int(f"{(cz * 16 + cz)}".replace("-", "")) & 0xFF
    return build_siboasi_packet(0xAB, [sp, cz, comb, sd, pl, sj])

def build_custom_sequence_packet(sd: int, sp: int, pl: int, sj: int, cz: int, points: list) -> bytes:
    """Opcode 0xAA: Multi-point sequence."""
    comb = int(f"{(sd * 16 + sp)}".replace("-", "")) & 0xFF
    payload = [comb, pl, sj, cz] + list(points)
    return build_siboasi_packet(0xAA, payload)


class TestSiboasiProtocol(unittest.TestCase):
    def test_stop_packet_framing(self):
        pkt = build_stop_packet()
        self.assertEqual(len(pkt), 12)
        self.assertEqual(pkt[0], 0xEF, "Start byte must be 0xEF")
        self.assertEqual(pkt[1], 12, "Total length must be 12")
        self.assertEqual(pkt[4], 0x04)
        self.assertEqual(pkt[5], 0x81)
        self.assertEqual(pkt[6], 0x01)
        self.assertEqual(pkt[8], 0xA0, "Stop opcode must be 0xA0")
        self.assertEqual(pkt[-3], 0x00)
        self.assertEqual(pkt[-2], 0x00)
        self.assertEqual(pkt[-1], 0xED, "End byte must be 0xED")

    def test_battery_packet_framing(self):
        pkt = build_battery_packet()
        self.assertEqual(len(pkt), 12)
        self.assertEqual(pkt[8], 0xC1, "Battery opcode must be 0xC1")
        self.assertEqual(pkt[-1], 0xED)

    def test_fixed_shot_packet(self):
        # sp=30, cz=5, sd=10, pl=3, sj=1
        pkt = build_fixed_shot_packet(sp=30, cz=5, sd=10, pl=3, sj=1)
        self.assertEqual(pkt[0], 0xEF)
        self.assertEqual(pkt[8], 0xAB)
        self.assertEqual(pkt[-1], 0xED)

    def test_custom_sequence_packet(self):
        # Multi-point drill: points [1, 4, 7]
        points = [1, 4, 7]
        pkt = build_custom_sequence_packet(sd=12, sp=30, pl=4, sj=1, cz=8, points=points)
        self.assertEqual(pkt[0], 0xEF)
        self.assertEqual(pkt[8], 0xAA)
        self.assertEqual(pkt[13:16], bytes([1, 4, 7]))
        self.assertEqual(pkt[-1], 0xED)


if __name__ == '__main__':
    unittest.main()
