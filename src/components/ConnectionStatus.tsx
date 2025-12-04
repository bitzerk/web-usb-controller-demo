import styled from 'styled-components';

const StatusContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background: rgba(18, 24, 40, 0.95);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 136, 0.2);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const StatusDot = styled.div<{ isConnected: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${(props) => (props.isConnected ? '#00ff88' : '#ff6b6b')};
  box-shadow: 0 0 10px
    ${(props) =>
      props.isConnected ? 'rgba(0, 255, 136, 0.6)' : 'rgba(255, 107, 107, 0.6)'};
  animation: ${(props) => (props.isConnected ? 'none' : 'pulse 2s infinite')};

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const StatusText = styled.span<{ isConnected: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${(props) => (props.isConnected ? '#00ff88' : '#ff6b6b')};
  text-shadow: 0 0 10px
    ${(props) =>
      props.isConnected
        ? 'rgba(0, 255, 136, 0.3)'
        : 'rgba(255, 107, 107, 0.3)'};
`;

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
}) => {
  return (
    <StatusContainer>
      <StatusDot isConnected={isConnected} />
      <StatusText isConnected={isConnected}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </StatusText>
    </StatusContainer>
  );
};
