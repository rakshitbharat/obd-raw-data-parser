import React from 'react';
import { EventEmitter } from 'events';

const mockComponent = (name: string) => {
  const ComponentMock = (props: any) => React.createElement(name, props);

  ComponentMock.displayName = name;

  return ComponentMock;
};

const mockNativeModules = {};

const mockNativeEventEmitter = jest
  .fn()
  .mockImplementation(() => new EventEmitter());

module.exports = {
  NativeModules: mockNativeModules,
  NativeEventEmitter: mockNativeEventEmitter,
  Platform: {
    OS: 'android',
    Version: 31,
    select: jest.fn(obj => obj.android),
  },
  ActivityIndicator: mockComponent('ActivityIndicator'),
  View: mockComponent('View'),
  Text: mockComponent('Text'),
};
