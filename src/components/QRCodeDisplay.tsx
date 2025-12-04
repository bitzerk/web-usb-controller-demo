import { QRCodeSVG } from 'qrcode.react';
import styled from 'styled-components';

const QRContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  margin: 20px 0;
  padding: 20px;
  background: rgba(10, 14, 26, 0.6);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 136, 0.3);
  box-shadow: 0 4px 15px rgba(0, 255, 136, 0.2);
`;

const QRCodeWrapper = styled.div`
  padding: 15px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
`;

const QRTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #00ff88;
  text-align: center;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
`;

const QRSubtitle = styled.div`
  font-size: 14px;
  color: #8899aa;
  text-align: center;
`;

interface QRCodeDisplayProps {
  url: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ url }) => {
  return (
    <QRContainer>
      <QRTitle>Scan to Control Remotely</QRTitle>
      <QRCodeWrapper>
        <QRCodeSVG
          value={url}
          size={200}
          level="M"
        />
      </QRCodeWrapper>
      <QRSubtitle>Scan with your phone to control brightness remotely</QRSubtitle>
    </QRContainer>
  );
};
