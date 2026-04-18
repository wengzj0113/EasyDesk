import React from 'react';
import { Badge, Tooltip, Space, Typography } from 'antd';
import {
  WifiOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface QualityIndicatorProps {
  latency: number;       // ms
  fps: number;
  packetLoss: number;    // 0-100
  bandwidth?: number;     // kbps
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

// 根据延迟判断质量等级
export const getQualityFromLatency = (latency: number): QualityIndicatorProps['quality'] => {
  if (latency < 50) return 'excellent';
  if (latency < 100) return 'good';
  if (latency < 200) return 'fair';
  return 'poor';
};

// 质量等级颜色
const qualityColors: Record<QualityIndicatorProps['quality'], string> = {
  excellent: '#52c41a',
  good: '#1890ff',
  fair: '#faad14',
  poor: '#f5222d',
};

// 质量等级文字
const qualityLabels: Record<QualityIndicatorProps['quality'], string> = {
  excellent: '极好',
  good: '良好',
  fair: '一般',
  poor: '较差',
};

// 质量等级圆点大小
const qualitySizes: Record<QualityIndicatorProps['quality'], number> = {
  excellent: 3,
  good: 3,
  fair: 2,
  poor: 2,
};

const QualityIndicator: React.FC<QualityIndicatorProps> = ({
  latency,
  fps,
  packetLoss,
  bandwidth,
  quality,
}) => {
  const color = qualityColors[quality];
  const label = qualityLabels[quality];

  const tooltipContent = (
    <div style={{ minWidth: 160 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>连接质量详情</div>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          延迟: <strong style={{ color: color }}>{latency}ms</strong>
        </div>
        <div>
          <ThunderboltOutlined style={{ marginRight: 6 }} />
          帧率: <strong>{fps > 0 ? `${fps}fps` : '-'}</strong>
        </div>
        <div>
          <WifiOutlined style={{ marginRight: 6 }} />
          丢包: <strong style={{ color: packetLoss > 5 ? '#f5222d' : 'inherit' }}>
            {packetLoss > 0 ? `${packetLoss.toFixed(1)}%` : '0%'}
          </strong>
        </div>
        {bandwidth !== undefined && bandwidth > 0 && (
          <div>
            带宽: <strong>{bandwidth > 1000 ? `${(bandwidth / 1000).toFixed(1)}Mbps` : `${bandwidth}kbps`}</strong>
          </div>
        )}
      </Space>
    </div>
  );

  return (
    <Tooltip title={tooltipContent} placement="bottom">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: 'default',
        userSelect: 'none',
      }}>
        {/* 质量状态点 */}
        <div style={{ position: 'relative', width: 20, height: 20 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${1 + i * 0.4})`,
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: i < qualitySizes[quality] ? color : 'rgba(255,255,255,0.2)',
                transition: 'background-color 0.3s ease',
              }}
            />
          ))}
        </div>

        {/* 状态文字 */}
        <Text style={{
          color,
          fontSize: 12,
          fontWeight: 500,
        }}>
          {label}
        </Text>

        {/* 延迟数字 */}
        {latency > 0 && (
          <Text style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 11,
          }}>
            {latency}ms
          </Text>
        )}
      </div>
    </Tooltip>
  );
};

export default QualityIndicator;
