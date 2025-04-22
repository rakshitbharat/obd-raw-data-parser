import { Permission, PermissionStatus } from 'react-native-permissions';

const RNP = {
  PERMISSIONS: {
    IOS: {
      APP_TRACKING_TRANSPARENCY: 'ios.permission.APP_TRACKING_TRANSPARENCY',
      BLUETOOTH: 'ios.permission.BLUETOOTH',
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
      BLUETOOTH_PERIPHERAL: 'ios.permission.BLUETOOTH_PERIPHERAL',
    },
    ANDROID: {
      BLUETOOTH_SCAN: 'android.permission.BLUETOOTH_SCAN',
      BLUETOOTH_CONNECT: 'android.permission.BLUETOOTH_CONNECT',
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
  },
  check: jest.fn(async () => Promise.resolve(PermissionStatus.GRANTED)),
  request: jest.fn(async () => Promise.resolve(PermissionStatus.GRANTED)),

  checkMultiple: jest.fn(
    async <P extends Permission[]>(
      _: P,
    ): Promise<Record<P[number], PermissionStatus>> => {
      return {} as Record<P[number], PermissionStatus>;
    },
  ),

  requestMultiple: jest.fn(
    async <P extends Permission[]>(
      _: P,
    ): Promise<Record<P[number], PermissionStatus>> => {
      return {} as Record<P[number], PermissionStatus>;
    },
  ),
  openSettings: jest.fn(() => Promise.resolve()),
};

export default RNP;
