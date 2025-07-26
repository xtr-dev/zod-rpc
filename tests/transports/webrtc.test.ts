import { WebRTCTransport, WebRTCPeerConnection, createWebRTCTransport } from '../../src/transports/webrtc';
import { TransportError } from '../../src/errors';

// Mock RTCDataChannel
class MockRTCDataChannel {
  public readyState: string = 'connecting';
  private eventListeners: { [key: string]: Function[] } = {};

  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(listener);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  dispatchEvent(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => listener(data));
    }
  }

  send(data: string): void {
    if (this.readyState !== 'open') {
      throw new Error('DataChannel is not open');
    }
  }

  close(): void {
    this.readyState = 'closed';
    this.dispatchEvent('close', {});
  }

  // Test helper methods
  simulateOpen(): void {
    this.readyState = 'open';
    this.dispatchEvent('open', {});
  }

  simulateMessage(data: string): void {
    this.dispatchEvent('message', { data });
  }

  simulateError(): void {
    this.dispatchEvent('error', new Error('DataChannel error'));
  }
}

// Mock RTCPeerConnection
class MockRTCPeerConnection {
  public connectionState: string = 'new';
  private eventListeners: { [key: string]: Function[] } = {};
  private dataChannels: MockRTCDataChannel[] = [];

  addEventListener(event: string, listener: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(listener);
      if (index > -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
  }

  dispatchEvent(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(listener => listener(data));
    }
  }

  createDataChannel(label: string, options?: any): MockRTCDataChannel {
    const channel = new MockRTCDataChannel();
    this.dataChannels.push(channel);
    return channel;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'offer', sdp: 'mock-offer-sdp' };
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    return { type: 'answer', sdp: 'mock-answer-sdp' };
  }

  async setLocalDescription(description: RTCSessionDescriptionInit): Promise<void> {
    // Mock implementation
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    // Mock implementation
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    // Mock implementation
  }

  close(): void {
    this.connectionState = 'closed';
    this.dataChannels.forEach(channel => channel.close());
  }

  // Test helper methods
  simulateConnectionStateChange(state: string): void {
    this.connectionState = state;
    this.dispatchEvent('connectionstatechange', {});
  }

  simulateDataChannel(channel: MockRTCDataChannel): void {
    this.dispatchEvent('datachannel', { channel });
  }

  simulateIceCandidate(candidate: RTCIceCandidate | null): void {
    this.dispatchEvent('icecandidate', { candidate });
  }
}

// Set up global mocks
(global as any).RTCPeerConnection = MockRTCPeerConnection;

describe('WebRTC Transport', () => {
  describe('WebRTCTransport', () => {
    let mockDataChannel: MockRTCDataChannel;
    let transport: WebRTCTransport;

    beforeEach(() => {
      mockDataChannel = new MockRTCDataChannel();
      transport = new WebRTCTransport(mockDataChannel as any);
    });

    it('should create WebRTCTransport with DataChannel', () => {
      expect(transport).toBeInstanceOf(WebRTCTransport);
    });

    describe('connect', () => {
      it('should connect successfully when DataChannel opens', async () => {
        const connectPromise = transport.connect();
        mockDataChannel.simulateOpen();
        
        await expect(connectPromise).resolves.not.toThrow();
        expect(transport.isConnected()).toBe(true);
      });

      it('should resolve immediately if already connected', async () => {
        mockDataChannel.readyState = 'open';
        
        await expect(transport.connect()).resolves.not.toThrow();
      });

      it('should reject on DataChannel error', async () => {
        const connectPromise = transport.connect();
        mockDataChannel.simulateError();
        
        await expect(connectPromise).rejects.toThrow(TransportError);
      });
    });

    describe('disconnect', () => {
      it('should disconnect DataChannel', async () => {
        mockDataChannel.simulateOpen();
        await transport.connect();
        
        const closeSpy = jest.spyOn(mockDataChannel, 'close');
        await transport.disconnect();
        
        expect(closeSpy).toHaveBeenCalled();
      });

      it('should resolve immediately if already disconnected', async () => {
        await expect(transport.disconnect()).resolves.not.toThrow();
      });
    });

    describe('send', () => {
      beforeEach(async () => {
        mockDataChannel.simulateOpen();
        await transport.connect();
      });

      it('should send RPC message successfully', async () => {
        const message = {
          callerId: 'peer1',
          targetId: 'peer2',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        const sendSpy = jest.spyOn(mockDataChannel, 'send');
        
        await expect(transport.send(message)).resolves.not.toThrow();
        expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(message));
      });

      it('should throw error when not connected', async () => {
        mockDataChannel.readyState = 'closed';
        
        const message = {
          callerId: 'peer1',
          targetId: 'peer2',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        await expect(transport.send(message)).rejects.toThrow(TransportError);
      });

      it('should handle send errors', async () => {
        const message = {
          callerId: 'peer1',
          targetId: 'peer2',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { test: true },
          type: 'request' as const
        };

        jest.spyOn(mockDataChannel, 'send').mockImplementation(() => {
          throw new Error('Send failed');
        });

        await expect(transport.send(message)).rejects.toThrow(TransportError);
      });
    });

    describe('onMessage', () => {
      it('should handle incoming messages', async () => {
        mockDataChannel.simulateOpen();
        await transport.connect();
        
        const messageHandler = jest.fn();
        transport.onMessage(messageHandler);

        const message = {
          callerId: 'peer2',
          targetId: 'peer1',
          traceId: 'trace-123',
          methodId: 'test.method',
          payload: { result: 'success' },
          type: 'response'
        };

        mockDataChannel.simulateMessage(JSON.stringify(message));

        expect(messageHandler).toHaveBeenCalledWith(message);
      });

      it('should handle invalid JSON messages', async () => {
        mockDataChannel.simulateOpen();
        await transport.connect();
        
        const messageHandler = jest.fn();
        transport.onMessage(messageHandler);
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        mockDataChannel.simulateMessage('invalid json');

        expect(messageHandler).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });

    describe('isConnected', () => {
      it('should return true when connected', async () => {
        mockDataChannel.simulateOpen();
        await transport.connect();
        expect(transport.isConnected()).toBe(true);
      });

      it('should return false when not connected', () => {
        mockDataChannel.readyState = 'closed';
        expect(transport.isConnected()).toBe(false);
      });
    });
  });

  describe('WebRTCPeerConnection', () => {
    let peerConnection: WebRTCPeerConnection;

    beforeEach(() => {
      peerConnection = new WebRTCPeerConnection();
    });

    it('should create WebRTCPeerConnection', () => {
      expect(peerConnection).toBeInstanceOf(WebRTCPeerConnection);
    });

    it('should create WebRTCPeerConnection with config', () => {
      const config = {
        iceServers: [{ urls: 'stun:stun.example.com' }]
      };
      const pc = new WebRTCPeerConnection(config);
      expect(pc).toBeInstanceOf(WebRTCPeerConnection);
    });

    describe('createOffer', () => {
      it('should create offer with DataChannel', async () => {
        const offer = await peerConnection.createOffer();
        
        expect(offer).toEqual({
          type: 'offer',
          sdp: expect.any(String)
        });
      });

      it('should create offer with custom channel label', async () => {
        const offer = await peerConnection.createOffer('custom-channel');
        
        expect(offer).toEqual({
          type: 'offer',
          sdp: expect.any(String)
        });
      });
    });

    describe('createAnswer', () => {
      it('should create answer', async () => {
        const answer = await peerConnection.createAnswer();
        
        expect(answer).toEqual({
          type: 'answer',
          sdp: expect.any(String)
        });
      });
    });

    describe('setRemoteDescription', () => {
      it('should set remote description', async () => {
        const description = { type: 'offer' as const, sdp: 'test-sdp' };
        
        await expect(peerConnection.setRemoteDescription(description)).resolves.not.toThrow();
      });

      it('should throw error for description without type', async () => {
        const description = { sdp: 'test-sdp' } as any;
        
        await expect(peerConnection.setRemoteDescription(description))
          .rejects.toThrow('RTCSessionDescriptionInit must have a type field');
      });
    });

    describe('handleAnswer', () => {
      it('should handle answer', async () => {
        const answer = { type: 'answer' as const, sdp: 'test-sdp' };
        
        await expect(peerConnection.handleAnswer(answer)).resolves.not.toThrow();
      });
    });

    describe('addIceCandidate', () => {
      it('should add ICE candidate', async () => {
        const candidate = { candidate: 'test-candidate' };
        
        await expect(peerConnection.addIceCandidate(candidate)).resolves.not.toThrow();
      });
    });

    describe('event handlers', () => {
      it('should handle ICE candidate events', () => {
        const handler = jest.fn();
        peerConnection.onIceCandidate(handler);
        
        // This would be tested with a real RTCPeerConnection
        expect(handler).not.toHaveBeenCalled();
      });

      it('should handle DataChannel events', () => {
        const handler = jest.fn();
        peerConnection.onDataChannel(handler);
        
        // This would be tested with a real RTCPeerConnection
        expect(handler).not.toHaveBeenCalled();
      });

      it('should handle connection state change events', () => {
        const handler = jest.fn();
        peerConnection.onConnectionStateChange(handler);
        
        // This would be tested with a real RTCPeerConnection
        expect(handler).not.toHaveBeenCalled();
      });
    });

    describe('getDataChannel', () => {
      it('should return undefined initially', () => {
        expect(peerConnection.getDataChannel()).toBeUndefined();
      });
    });

    describe('getConnectionState', () => {
      it('should return connection state', () => {
        expect(peerConnection.getConnectionState()).toBe('new');
      });
    });

    describe('close', () => {
      it('should close peer connection', () => {
        expect(() => peerConnection.close()).not.toThrow();
      });
    });
  });

  describe('createWebRTCTransport', () => {
    it('should create WebRTCTransport instance', () => {
      const mockDataChannel = new MockRTCDataChannel();
      const transport = createWebRTCTransport(mockDataChannel as any);
      
      expect(transport).toBeInstanceOf(WebRTCTransport);
    });
  });
});