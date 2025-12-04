import {useEffect, useState} from 'react';
import {useAppDispatch, useAppSelector} from '../store/hooks';
import {reloadConnectedDevices, loadSupportedIds} from '../store/devicesThunks';
import {getConnectedDevices, setForceAuthorize} from '../store/devicesSlice';
import {KeyboardAPI} from '../utils/keyboard-api';
import {LightingValue} from '@the-via/reader';
import styled from 'styled-components';

const DemoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(180deg, #0a0e1a 0%, #121828 50%, #0a0e1a 100%);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, sans-serif;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
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
  }
`;

const Card = styled.div`
  background: rgba(18, 24, 40, 0.95);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 255, 136, 0.5),
    inset 0 1px 0 rgba(0, 255, 136, 0.1);
  max-width: 500px;
  width: 100%;
  border: 1px solid rgba(0, 255, 136, 0.2);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 1;
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

export const KeyboardDemo = () => {
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
        } catch (err2) {
          console.error('❌ Both brightness types failed:', err2);
          setError(
            'Failed to set brightness. Please try reconnecting your keyboard.',
          );
        }
      }
    }
  };

  const brightnessPercentage = Math.round((brightness / 255) * 100);

  return (
    <DemoContainer>
      <Card>
        <Title>USB Keyboard Control Demo</Title>
        <Subtitle>
          Control your keyboard's backlight directly from the web
        </Subtitle>

        {!device ? (
          <>
            <Button onClick={handleAuthorize} disabled={isAuthorizing}>
              {isAuthorizing ? 'Authorizing...' : 'Authorize Keyboard'}
            </Button>
            <StatusMessage type="info">
              Click the button above to connect your compatible keyboard
            </StatusMessage>
          </>
        ) : (
          <>
            <DeviceInfo>
              <DeviceName>
                {device.productName || 'Connected Keyboard'}
              </DeviceName>
              <DeviceDetails>
                VID: 0x
                {device.vendorId.toString(16).padStart(4, '0').toUpperCase()} |
                PID: 0x
                {device.productId.toString(16).padStart(4, '0').toUpperCase()}
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

        {error && <StatusMessage type="error">{error}</StatusMessage>}
      </Card>
    </DemoContainer>
  );
};
