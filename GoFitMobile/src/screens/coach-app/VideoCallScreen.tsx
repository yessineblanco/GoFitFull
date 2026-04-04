import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { videoCallService } from '@/services/videoCall';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera,
} from 'lucide-react-native';

let LiveKitRoom: any = null;
let VideoTrack: any = null;
let AudioTrack: any = null;
let useRoom: any = null;
let useParticipant: any = null;
let registerGlobals: any = null;

try {
  const livekit = require('@livekit/react-native');
  LiveKitRoom = livekit.LivekitRoom;
  VideoTrack = livekit.VideoTrack;
  AudioTrack = livekit.AudioTrack;
  useRoom = livekit.useRoom;
  useParticipant = livekit.useParticipant;
  registerGlobals = livekit.registerGlobals;

  registerGlobals?.();
} catch {
  // LiveKit not available (Expo Go)
}

const PRIMARY_GREEN = '#B4F04E';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

export const VideoCallScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const { bookingId, videoRoomId } = route.params || {};

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (!user?.id || !videoRoomId) return;

    setConnectionState('connecting');
    setError(null);

    const displayName = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';
    const result = await videoCallService.generateToken(videoRoomId, displayName, user.id);

    if (!result) {
      setConnectionState('error');
      setError(t('videoCall.connectionFailed'));
      return;
    }

    setToken(result.token);
    setServerUrl(result.url);
    setConnectionState('connected');
  }, [user, videoRoomId, t]);

  useEffect(() => {
    connect();
  }, [connect]);

  const handleEndCall = useCallback(() => {
    setConnectionState('disconnected');
    navigation.goBack();
  }, [navigation]);

  const handleToggleMic = useCallback(() => {
    setMicEnabled((prev) => !prev);
  }, []);

  const handleToggleCamera = useCallback(() => {
    setCameraEnabled((prev) => !prev);
  }, []);

  const handleFlipCamera = useCallback(() => {
    // Camera flip handled by LiveKit track methods when available
  }, []);

  if (!LiveKitRoom) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <VideoOff size={48} color="rgba(255,255,255,0.3)" />
          <Text style={styles.errorTitle}>{t('videoCall.unavailable')}</Text>
          <Text style={styles.errorSubtitle}>{t('videoCall.requiresDevBuild')}</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (connectionState === 'connecting' || connectionState === 'idle') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_GREEN} />
          <Text style={styles.connectingText}>{t('videoCall.connecting')}</Text>
        </View>
      </View>
    );
  }

  if (connectionState === 'error') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.centered}>
          <VideoOff size={48} color="#FF6B6B" />
          <Text style={styles.errorTitle}>{error || t('videoCall.connectionFailed')}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={connect}>
            <Text style={styles.retryButtonText}>{t('videoCall.retry')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>{t('common.goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {token && serverUrl ? (
        <LiveKitRoom
          serverUrl={serverUrl}
          token={token}
          connect={true}
          options={{
            adaptiveStream: { pixelDensity: 'screen' },
            dynacast: true,
          }}
          audio={micEnabled}
          video={cameraEnabled}
          onDisconnected={() => {
            setConnectionState('disconnected');
            navigation.goBack();
          }}
          onError={(err: any) => {
            setError(err?.message || t('videoCall.connectionFailed'));
            setConnectionState('error');
          }}
        >
          <RoomView
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            onToggleMic={handleToggleMic}
            onToggleCamera={handleToggleCamera}
            onFlipCamera={handleFlipCamera}
            onEndCall={handleEndCall}
          />
        </LiveKitRoom>
      ) : (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={PRIMARY_GREEN} />
        </View>
      )}
    </View>
  );
};

interface RoomViewProps {
  micEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onFlipCamera: () => void;
  onEndCall: () => void;
}

const RoomView: React.FC<RoomViewProps> = ({
  micEnabled, cameraEnabled, onToggleMic, onToggleCamera, onFlipCamera, onEndCall,
}) => {
  const { t } = useTranslation();

  return (
    <View style={styles.roomContainer}>
      <View style={styles.videoArea}>
        <View style={styles.remoteVideoContainer}>
          <Text style={styles.waitingText}>{t('videoCall.inCall')}</Text>
        </View>
      </View>

      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.controlButton, !micEnabled && styles.controlButtonDisabled]}
          onPress={onToggleMic}
          activeOpacity={0.7}
        >
          {micEnabled ? (
            <Mic size={24} color="#FFFFFF" />
          ) : (
            <MicOff size={24} color="#FF6B6B" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, !cameraEnabled && styles.controlButtonDisabled]}
          onPress={onToggleCamera}
          activeOpacity={0.7}
        >
          {cameraEnabled ? (
            <Video size={24} color="#FFFFFF" />
          ) : (
            <VideoOff size={24} color="#FF6B6B" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={onFlipCamera}
          activeOpacity={0.7}
        >
          <SwitchCamera size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endCallButton}
          onPress={onEndCall}
          activeOpacity={0.7}
        >
          <PhoneOff size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  connectingText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(16),
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
  },
  errorTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(18),
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 16,
  },
  errorSubtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: PRIMARY_GREEN,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    color: '#000000',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  backButtonText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.6)',
  },
  roomContainer: {
    flex: 1,
  },
  videoArea: {
    flex: 1,
    backgroundColor: '#111111',
  },
  remoteVideoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(16),
    color: 'rgba(255,255,255,0.5)',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonDisabled: {
    backgroundColor: 'rgba(255,107,107,0.2)',
  },
  endCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
