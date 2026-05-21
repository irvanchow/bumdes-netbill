// Web Bluetooth API wrapper for ESC/POS thermal printers

const PRINTER_SERVICE_UUID = "000018f0-0000-1000-8000-00805f9b34fb";
const PRINTER_CHARACTERISTIC_UUID = "00002af1-0000-1000-8000-00805f9b34fb";

// Alternative UUIDs used by some printers
const ALT_SERVICE_UUIDS = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
];

const ALT_CHARACTERISTIC_UUIDS = [
  "00002af1-0000-1000-8000-00805f9b34fb",
  "bef8d6c9-9c21-4c9e-b632-bd58c1009f9f",
  "49535343-8841-43f4-a8d4-ecbe34729bb3",
];

let device: BluetoothDevice | null = null;
let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

export async function connectPrinter(): Promise<boolean> {
  try {
    // Check if bluetooth is available
    if (!navigator.bluetooth) {
      throw new Error("Browser tidak mendukung Bluetooth");
    }

    // Request device with printer service
    device = await navigator.bluetooth.requestDevice({
      filters: ALT_SERVICE_UUIDS.map((uuid) => ({ services: [uuid] })),
      optionalServices: ALT_SERVICE_UUIDS,
    });

    if (!device.gatt) {
      throw new Error("GATT tidak tersedia");
    }

    const server = await device.gatt.connect();

    // Try each service/characteristic combination
    for (const serviceUuid of ALT_SERVICE_UUIDS) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        for (const charUuid of ALT_CHARACTERISTIC_UUIDS) {
          try {
            characteristic = await service.getCharacteristic(charUuid);
            if (characteristic) return true;
          } catch {
            continue;
          }
        }
        // If no specific characteristic found, try getting all
        const chars = await service.getCharacteristics();
        for (const char of chars) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char;
            return true;
          }
        }
      } catch {
        continue;
      }
    }

    throw new Error("Tidak dapat menemukan characteristic printer");
  } catch (error) {
    device = null;
    characteristic = null;
    throw error;
  }
}

export async function printData(data: Uint8Array): Promise<void> {
  if (!characteristic) {
    throw new Error("Printer belum terhubung");
  }

  // Send data in chunks (BLE has MTU limit, typically 20 bytes but can be larger)
  const chunkSize = 100;
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    if (characteristic.properties.writeWithoutResponse) {
      await characteristic.writeValueWithoutResponse(chunk);
    } else {
      await characteristic.writeValueWithResponse(chunk);
    }
    // Small delay between chunks to prevent buffer overflow
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

export function disconnectPrinter(): void {
  if (device?.gatt?.connected) {
    device.gatt.disconnect();
  }
  device = null;
  characteristic = null;
}

export function isPrinterConnected(): boolean {
  return !!(device?.gatt?.connected && characteristic);
}

export function getPrinterName(): string | null {
  return device?.name || null;
}
