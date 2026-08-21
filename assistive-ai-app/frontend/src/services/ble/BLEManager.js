import { BleManager } from 'react-native-ble-plx';

const manager = new BleManager();

export const scanDevices = (onDeviceFound) => {
  manager.startDeviceScan(null, null, (error, device) => {
    if (error) {
      console.log('Scan error:', error);
      return;
    }

    if (device) {
      console.log('Found device:', device.name);
      onDeviceFound(device);
    }
  });

  setTimeout(() => {
    manager.stopDeviceScan();
    console.log('Scan stopped');
  }, 10000);
};

export const connectDevice = async (device) => {
  try {
    const connected = await device.connect();
    await connected.discoverAllServicesAndCharacteristics();
    console.log('Connected to:', device.name);
  } catch (e) {
    console.log('Connection error:', e);
  }
};