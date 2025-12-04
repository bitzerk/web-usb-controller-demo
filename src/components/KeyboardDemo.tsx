import {useEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {reloadConnectedDevices, loadSupportedIds} from '../store/devicesThunks';
import {getConnectedDevices, setForceAuthorize} from '../store/devicesSlice';
import {KeyboardAPI} from '../utils/keyboard-api';
import {LightingValue} from '@the-via/reader';
import styled from 'styled-components';
import {useSocketIO} from '../hooks/useSocketIO';
import {useUUID} from '../hooks/useUUID';
import {detectMode, generateRemoteURL} from '../utils/mode-detection';
import {QRCodeDisplay} from './QRCodeDisplay';
import {ConnectionStatus} from './ConnectionStatus';
import type {
  BrightnessSetEvent,
  BrightnessSyncEvent,
} from '../types/socket-events';

const DemoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 100vh;
  height: 100vh;
  background: linear-gradient(180deg, #0a0e1a 0%, #121828 50%, #0a0e1a 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;

  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(
        circle at 20% 30%,
        rgba(0, 255, 136, 0.08) 0%,
        transparent 50%
      ),
      radial-gradient(
        circle at 80% 70%,
        rgba(0, 255, 136, 0.06) 0%,
        transparent 50%
      );
    pointer-events: none;
    z-index: 0;
  }
`;

const Card = styled.div`
  background: rgba(18, 24, 40, 0.95);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 255, 136, 0.5),
    inset 0 1px 0 rgba(0, 255, 136, 0.1);
  max-width: 500px;
  width: calc(100% - 40px);
  border: 1px solid rgba(0, 255, 136, 0.2);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
  margin: 20px;
  margin-top: auto;
  margin-bottom: auto;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 10px;
  text-align: center;
  text-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #8899aa;
  margin-bottom: 30px;
  text-align: center;
`;

const Button = styled.button`
  background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
  color: #0a0e1a;
  border: none;
  border-radius: 10px;
  padding: 15px 30px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 255, 136, 0.6),
      0 0 30px rgba(0, 255, 136, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2);
    background: linear-gradient(135deg, #00ffaa 0%, #00dd7a 100%);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 8px rgba(0, 255, 136, 0.2);
  }
`;

const DeviceInfo = styled.div`
  background: rgba(10, 14, 26, 0.6);
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 30px;
  border: 1px solid rgba(0, 255, 136, 0.2);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const DeviceName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #00ff88;
  margin-bottom: 5px;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
`;

const DeviceDetails = styled.div`
  font-size: 14px;
  color: #8899aa;
`;

const SliderContainer = styled.div`
  margin-top: 30px;
`;

const SliderLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const LabelText = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const BrightnessValue = styled.span`
  font-size: 24px;
  font-weight: 700;
  color: #00ff88;
  text-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
`;

const Slider = styled.input<{value: number}>`
  width: 100%;
  height: 8px;
  border-radius: 5px;
  background: linear-gradient(
    to right,
    #00ff88 0%,
    #00ff88 ${(props) => (props.value / 255) * 100}%,
    #1a2332 ${(props) => (props.value / 255) * 100}%,
    #1a2332 100%
  );
  outline: none;
  -webkit-appearance: none;
  box-shadow: 0 2px 10px rgba(0, 255, 136, 0.3),
    inset 0 1px 2px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(0, 255, 136, 0.3);

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 255, 136, 0.6),
      0 0 20px rgba(0, 255, 136, 0.4);
    border: 2px solid #0a0e1a;
    transition: all 0.2s ease;
  }

  &::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 15px rgba(0, 255, 136, 0.8),
      0 0 30px rgba(0, 255, 136, 0.6);
  }

  &::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%);
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 255, 136, 0.6),
      0 0 20px rgba(0, 255, 136, 0.4);
    border: 2px solid #0a0e1a;
    transition: all 0.2s ease;
  }

  &::-moz-range-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 4px 15px rgba(0, 255, 136, 0.8),
      0 0 30px rgba(0, 255, 136, 0.6);
  }
`;

const StatusMessage = styled.div<{type: 'error' | 'info'}>`
  padding: 15px;
  border-radius: 10px;
  margin-top: 20px;
  font-size: 14px;
  background: ${(props) =>
    props.type === 'error'
      ? 'rgba(255, 68, 68, 0.15)'
      : 'rgba(0, 255, 136, 0.15)'};
  color: ${(props) => (props.type === 'error' ? '#ff6b6b' : '#00ff88')};
  text-align: center;
  border: 1px solid
    ${(props) =>
      props.type === 'error'
        ? 'rgba(255, 68, 68, 0.3)'
        : 'rgba(0, 255, 136, 0.3)'};
  box-shadow: ${(props) =>
    props.type === 'error'
      ? '0 4px 15px rgba(255, 68, 68, 0.2)'
      : '0 4px 15px rgba(0, 255, 136, 0.2)'};
`;

const ModeIndicator = styled.div<{mode: 'host' | 'remote'}>`
  display: inline-block;
  padding: 8px 16px;
  margin-bottom: 20px;
  background: ${(props) =>
    props.mode === 'host'
      ? 'rgba(0, 255, 136, 0.15)'
      : 'rgba(136, 136, 255, 0.15)'};
  border: 1px solid
    ${(props) =>
      props.mode === 'host'
        ? 'rgba(0, 255, 136, 0.3)'
        : 'rgba(136, 136, 255, 0.3)'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.mode === 'host' ? '#00ff88' : '#8888ff')};
  text-transform: uppercase;
  letter-spacing: 1px;
`;

export const KeyboardDemo = () => {
  // 1. Mode Detection
  const {mode, remoteUUID} = detectMode();

  // 2. UUID Management
  const hostUUID = useUUID(); // Only used in host mode
  const activeUUID = mode === 'host' ? hostUUID : remoteUUID!;

  // 3. Socket.IO Connection
  const {isConnected, emit, on, off} = useSocketIO({
    uuid: activeUUID,
    mode,
  });

  // 4. Existing state
  const dispatch = useAppDispatch();
  const connectedDevices = useAppSelector(getConnectedDevices);
  const [brightness, setBrightness] = useState(128);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboardAPI, setKeyboardAPI] = useState<KeyboardAPI | null>(null);
  const [brightnessType, setBrightnessType] = useState<
    'qmk_rgblight' | 'backlight' | null
  >(null);

  const devicesList = Object.values(connectedDevices);
  const device = devicesList[0];

  // 5. Socket Event Handlers - Host Mode: Listen for remote brightness changes
  useEffect(() => {
    if (mode === 'host' && isConnected) {
      const handleBrightnessSet = (data: BrightnessSetEvent) => {
        if (data.uuid === hostUUID) {
          // console.log(
          //   '[Host] Received brightness:set from remote:',
          //   data.brightness,
          // );
          setBrightness(data.brightness);

          // Apply to physical keyboard if connected
          if (keyboardAPI && brightnessType) {
            const lightingValue =
              brightnessType === 'backlight'
                ? LightingValue.BACKLIGHT_BRIGHTNESS
                : LightingValue.QMK_RGBLIGHT_BRIGHTNESS;

            keyboardAPI
              .setBacklightValue(lightingValue, data.brightness)
              .then(() => {
                // console.log('[Host] Applied remote brightness to keyboard');
              })
              .catch((err) => {
                console.error('[Host] Failed to apply brightness:', err);
              });
          }
        }
      };

      on('brightness:set', handleBrightnessSet);

      return () => {
        off('brightness:set', handleBrightnessSet);
      };
    }
  }, [mode, isConnected, hostUUID, keyboardAPI, brightnessType, on, off]);

  // Remote Mode: Listen for host brightness sync
  useEffect(() => {
    if (mode === 'remote' && isConnected) {
      const handleBrightnessSync = (data: BrightnessSyncEvent) => {
        if (data.uuid === remoteUUID) {
          // console.log('[Remote] Received brightness:sync from host:', data);
          setBrightness(data.brightness);
          setBrightnessType(data.brightnessType);
        }
      };

      on('brightness:sync', handleBrightnessSync);

      return () => {
        off('brightness:sync', handleBrightnessSync);
      };
    }
  }, [mode, isConnected, remoteUUID, on, off]);

  useEffect(() => {
    // Initialize store and load supported IDs
    dispatch(loadSupportedIds());
    // Load any already authorized devices
    dispatch(reloadConnectedDevices());
  }, [dispatch]);

  useEffect(() => {
    if (device && !keyboardAPI) {
      try {
        const api = new KeyboardAPI(device.path);
        setKeyboardAPI(api);
        setError(null);

        // Try to read current brightness
        // First try QMK RGB light brightness (for keyboards like Keychron K2 Pro)
        console.log('🔍 Attempting to read QMK_RGBLIGHT_BRIGHTNESS...');
        api
          .getBacklightValue(LightingValue.QMK_RGBLIGHT_BRIGHTNESS)
          .then((value) => {
            console.log('✅ QMK_RGBLIGHT_BRIGHTNESS value:', value);
            if (value !== undefined && value[0] !== undefined) {
              setBrightness(value[0]);
              setBrightnessType('qmk_rgblight');
              console.log('✅ Set brightness to:', value[0], '(QMK RGB Light)');
            }
          })
          .catch((err) => {
            console.warn(
              '⚠️ QMK_RGBLIGHT_BRIGHTNESS not supported, trying BACKLIGHT_BRIGHTNESS:',
              err,
            );
            // Fallback to regular backlight brightness
            api
              .getBacklightValue(LightingValue.BACKLIGHT_BRIGHTNESS)
              .then((value) => {
                console.log('✅ BACKLIGHT_BRIGHTNESS value:', value);
                if (value !== undefined && value[0] !== undefined) {
                  setBrightness(value[0]);
                  setBrightnessType('backlight');
                  console.log(
                    '✅ Set brightness to:',
                    value[0],
                    '(Regular Backlight)',
                  );
                }
              })
              .catch((err2) => {
                console.error('❌ Failed to read brightness:', err2);
              });
          });
      } catch (err) {
        console.error('Failed to create keyboard API:', err);
        setError('Failed to connect to keyboard');
      }
    }
  }, [device, keyboardAPI]);

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    setError(null);
    try {
      dispatch(setForceAuthorize(true));
      await dispatch(reloadConnectedDevices());
      dispatch(setForceAuthorize(false));
    } catch (err) {
      console.error('Authorization failed:', err);
      setError('Failed to authorize device. Please try again.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleBrightnessChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newBrightness = parseInt(e.target.value);
    setBrightness(newBrightness);

    if (mode === 'host') {
      // Host Mode: Apply to keyboard and emit sync
      if (keyboardAPI) {
        try {
          // Use the brightness type we detected during initialization
          const lightingValue =
            brightnessType === 'backlight'
              ? LightingValue.BACKLIGHT_BRIGHTNESS
              : LightingValue.QMK_RGBLIGHT_BRIGHTNESS;

          console.log(
            `💡 Setting ${brightnessType} brightness to:`,
            newBrightness,
            `(value: ${lightingValue})`,
          );

          await keyboardAPI.setBacklightValue(lightingValue, newBrightness);
          console.log('✅ Brightness set successfully');
          setError(null);

          // Emit sync to remotes
          if (isConnected) {
            emit('brightness:sync', {
              uuid: hostUUID,
              brightness: newBrightness,
              brightnessType: brightnessType!,
            });
          }
        } catch (err) {
          console.error('❌ Failed to set brightness:', err);
          // Try the other type as fallback
          try {
            const fallbackValue =
              brightnessType === 'backlight'
                ? LightingValue.QMK_RGBLIGHT_BRIGHTNESS
                : LightingValue.BACKLIGHT_BRIGHTNESS;

            console.log('⚠️ Trying fallback brightness type:', fallbackValue);
            await keyboardAPI.setBacklightValue(fallbackValue, newBrightness);
            setBrightnessType(
              brightnessType === 'backlight' ? 'qmk_rgblight' : 'backlight',
            );
            console.log('✅ Fallback brightness set successfully');
            setError(null);

            // Emit sync with updated brightness type
            if (isConnected) {
              emit('brightness:sync', {
                uuid: hostUUID,
                brightness: newBrightness,
                brightnessType:
                  brightnessType === 'backlight' ? 'qmk_rgblight' : 'backlight',
              });
            }
          } catch (err2) {
            console.error('❌ Both brightness types failed:', err2);
            setError(
              'Failed to set brightness. Please try reconnecting your keyboard.',
            );
          }
        }
      }
    } else {
      // Remote Mode: Emit set command to host
      if (isConnected) {
        emit('brightness:set', {
          uuid: remoteUUID!,
          brightness: newBrightness,
        });
        // console.log('[Remote] Emitted brightness:set');
      }
    }
  };

  const brightnessPercentage = Math.round((brightness / 255) * 100);

  return (
    <DemoContainer>
      <ConnectionStatus isConnected={isConnected} />

      <Card>
        <ModeIndicator mode={mode}>
          {mode === 'host' ? '🖥️ Host Mode' : '📱 Remote Control Mode'}
        </ModeIndicator>

        {mode === 'host' ? (
          // HOST MODE UI
          <>
            {!device ? (
              <>
                <Title>USB Keyboard Control Demo</Title>
                <Subtitle>
                  {mode === 'host'
                    ? "Control your keyboard's backlight directly from the web"
                    : 'Controlling keyboard remotely'}
                </Subtitle>
                <Button onClick={handleAuthorize} disabled={isAuthorizing}>
                  {isAuthorizing ? 'Authorizing...' : 'Authorize Keyboard'}
                </Button>
                <StatusMessage type="info">
                  Click the button above to connect your compatible keyboard
                </StatusMessage>
              </>
            ) : (
              <>
                {/* QR Code Display */}
                <QRCodeDisplay url={generateRemoteURL(hostUUID)} />

                <DeviceInfo>
                  <DeviceName>
                    {device.productName || 'Connected Keyboard'}
                  </DeviceName>
                  <DeviceDetails>
                    VID: 0x
                    {device.vendorId
                      .toString(16)
                      .padStart(4, '0')
                      .toUpperCase()}{' '}
                    | PID: 0x
                    {device.productId
                      .toString(16)
                      .padStart(4, '0')
                      .toUpperCase()}
                  </DeviceDetails>
                  <DeviceDetails>
                    Protocol: v{device.protocol} |{' '}
                    {device.requiredDefinitionVersion.toUpperCase()}
                  </DeviceDetails>
                  {brightnessType && (
                    <DeviceDetails
                      style={{
                        marginTop: '5px',
                        color: '#00ff88',
                        textShadow: '0 0 10px rgba(0, 255, 136, 0.5)',
                      }}
                    >
                      ✓ Using{' '}
                      {brightnessType === 'qmk_rgblight'
                        ? 'QMK RGB Light'
                        : 'Standard Backlight'}
                    </DeviceDetails>
                  )}
                </DeviceInfo>

                <SliderContainer>
                  <SliderLabel>
                    <LabelText>Backlight Brightness</LabelText>
                    <BrightnessValue>{brightnessPercentage}%</BrightnessValue>
                  </SliderLabel>
                  <Slider
                    type="range"
                    min="0"
                    max="255"
                    value={brightness}
                    onChange={handleBrightnessChange}
                  />
                </SliderContainer>

                <Button onClick={handleAuthorize} style={{marginTop: '20px'}}>
                  Connect Different Keyboard
                </Button>
              </>
            )}
          </>
        ) : (
          // REMOTE MODE UI
          <>
            <StatusMessage type="info">
              Connected to host keyboard remotely
            </StatusMessage>

            <SliderContainer>
              <SliderLabel>
                <LabelText>Backlight Brightness</LabelText>
                <BrightnessValue>{brightnessPercentage}%</BrightnessValue>
              </SliderLabel>
              <Slider
                type="range"
                min="0"
                max="255"
                value={brightness}
                onChange={handleBrightnessChange}
              />
            </SliderContainer>

            {!isConnected && (
              <StatusMessage type="error">
                Unable to connect to server. Please check your connection.
              </StatusMessage>
            )}
          </>
        )}

        {error && <StatusMessage type="error">{error}</StatusMessage>}
      </Card>
    </DemoContainer>
  );
};
