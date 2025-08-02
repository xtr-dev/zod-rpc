import { Transport, RPCMessage } from '../types';
import { TransportError } from '../errors';

// WebRTC types are now included in modern TypeScript/DOM libs

/**
 * @group Transport Layer
 */
export class WebRTCTransport implements Transport {
  private messageHandler?: (message: RPCMessage) => void;

  constructor(private dataChannel: RTCDataChannel) {
    this.setupEventHandlers();
  }

  async send(message: RPCMessage): Promise<void> {
    if (!this.isConnected()) {
      throw new TransportError('WebRTC DataChannel is not connected');
    }

    try {
      this.dataChannel.send(JSON.stringify(message));
    } catch (error) {
      throw new TransportError(
        `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  onMessage(handler: (message: RPCMessage) => void): void {
    this.messageHandler = handler;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve();
        return;
      }

      const onOpen = (): void => {
        this.dataChannel.removeEventListener('open', onOpen);
        this.dataChannel.removeEventListener('error', onError);
        resolve();
      };

      const onError = (_event: Event): void => {
        this.dataChannel.removeEventListener('open', onOpen);
        this.dataChannel.removeEventListener('error', onError);
        reject(new TransportError('Failed to connect WebRTC DataChannel'));
      };

      if (this.dataChannel.readyState === 'open') {
        resolve();
      } else {
        this.dataChannel.addEventListener('open', onOpen);
        this.dataChannel.addEventListener('error', onError);
      }
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve();
        return;
      }

      const onClose = (): void => {
        this.dataChannel.removeEventListener('close', onClose);
        resolve();
      };

      this.dataChannel.addEventListener('close', onClose);
      this.dataChannel.close();
    });
  }

  isConnected(): boolean {
    return this.dataChannel.readyState === 'open';
  }

  private setupEventHandlers(): void {
    this.dataChannel.addEventListener('message', (event: MessageEvent) => {
      try {
        const message: RPCMessage = JSON.parse(event.data);
        this.messageHandler?.(message);
      } catch (error) {
        console.error('Failed to parse WebRTC message:', error);
      }
    });

    this.dataChannel.addEventListener('error', (event: Event) => {
      console.error('WebRTC DataChannel error:', event);
    });
  }
}

/**
 * @group Transport Layer
 */
export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
  bundlePolicy?: RTCBundlePolicy;
}

/**
 * @group Transport Layer
 */
export class WebRTCPeerConnection {
  private peerConnection: RTCPeerConnection;
  private dataChannel?: RTCDataChannel;

  constructor(config?: WebRTCConfig) {
    this.peerConnection = new RTCPeerConnection(config as RTCConfiguration);
    this.setupPeerConnectionHandlers();
  }

  async createOffer(channelLabel = 'rpc-channel'): Promise<RTCSessionDescriptionInit> {
    this.dataChannel = this.peerConnection.createDataChannel(channelLabel, {
      ordered: true,
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Ensure type field is present
    return {
      type: 'offer' as const,
      sdp: offer.sdp,
    };
  }

  async createAnswer(): Promise<RTCSessionDescriptionInit> {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Ensure type field is present
    return {
      type: 'answer' as const,
      sdp: answer.sdp,
    };
  }

  async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    await this.peerConnection.setRemoteDescription(answer);
  }

  async setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    // Ensure the description has the required type field
    if (!description.type) {
      throw new Error('RTCSessionDescriptionInit must have a type field');
    }
    await this.peerConnection.setRemoteDescription(description);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    await this.peerConnection.addIceCandidate(candidate);
  }

  onIceCandidate(handler: (candidate: RTCIceCandidate | null) => void): void {
    this.peerConnection.addEventListener('icecandidate', (event: RTCPeerConnectionIceEvent) => {
      handler(event.candidate);
    });
  }

  onDataChannel(handler: (channel: RTCDataChannel) => void): void {
    this.peerConnection.addEventListener('datachannel', (event: RTCDataChannelEvent) => {
      handler(event.channel);
    });
  }

  onConnectionStateChange(handler: (state: RTCPeerConnectionState) => void): void {
    this.peerConnection.addEventListener('connectionstatechange', () => {
      handler(this.peerConnection.connectionState);
    });
  }

  getDataChannel(): RTCDataChannel | undefined {
    return this.dataChannel;
  }

  getConnectionState(): RTCPeerConnectionState {
    return this.peerConnection.connectionState;
  }

  close(): void {
    this.dataChannel?.close();
    this.peerConnection.close();
  }

  private setupPeerConnectionHandlers(): void {
    this.peerConnection.addEventListener('connectionstatechange', () => {
      console.log('WebRTC connection state:', this.peerConnection.connectionState);
    });

    this.peerConnection.addEventListener('datachannel', (event: RTCDataChannelEvent) => {
      if (!this.dataChannel) {
        this.dataChannel = event.channel;
      }
    });
  }
}

/**
 * @group Transport Layer
 */
export function createWebRTCTransport(dataChannel: RTCDataChannel): WebRTCTransport {
  return new WebRTCTransport(dataChannel);
}
