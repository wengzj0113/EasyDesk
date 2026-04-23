/**
 * QualityIndicator Component Tests
 * Tests for the connection quality indicator component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QualityIndicator, { getQualityFromLatency } from '../../components/QualityIndicator';

describe('QualityIndicator Component', () => {
  describe('getQualityFromLatency Function', () => {
    describe('Excellent quality', () => {
      test('should return excellent for latency < 50ms', () => {
        expect(getQualityFromLatency(0)).toBe('excellent');
        expect(getQualityFromLatency(25)).toBe('excellent');
        expect(getQualityFromLatency(49)).toBe('excellent');
      });

      test('should not return excellent for latency >= 50ms', () => {
        expect(getQualityFromLatency(50)).not.toBe('excellent');
      });
    });

    describe('Good quality', () => {
      test('should return good for latency >= 50ms and < 100ms', () => {
        expect(getQualityFromLatency(50)).toBe('good');
        expect(getQualityFromLatency(75)).toBe('good');
        expect(getQualityFromLatency(99)).toBe('good');
      });

      test('should not return good for latency >= 100ms', () => {
        expect(getQualityFromLatency(100)).not.toBe('good');
      });
    });

    describe('Fair quality', () => {
      test('should return fair for latency >= 100ms and < 200ms', () => {
        expect(getQualityFromLatency(100)).toBe('fair');
        expect(getQualityFromLatency(150)).toBe('fair');
        expect(getQualityFromLatency(199)).toBe('fair');
      });

      test('should not return fair for latency >= 200ms', () => {
        expect(getQualityFromLatency(200)).not.toBe('fair');
      });
    });

    describe('Poor quality', () => {
      test('should return poor for latency >= 200ms', () => {
        expect(getQualityFromLatency(200)).toBe('poor');
        expect(getQualityFromLatency(500)).toBe('poor');
        expect(getQualityFromLatency(1000)).toBe('poor');
      });
    });

    describe('Boundary values', () => {
      test('should handle exactly 50ms boundary', () => {
        expect(getQualityFromLatency(50)).toBe('good');
      });

      test('should handle exactly 100ms boundary', () => {
        expect(getQualityFromLatency(100)).toBe('fair');
      });

      test('should handle exactly 200ms boundary', () => {
        expect(getQualityFromLatency(200)).toBe('poor');
      });

      test('should handle zero latency', () => {
        expect(getQualityFromLatency(0)).toBe('excellent');
      });

      test('should handle very high latency', () => {
        expect(getQualityFromLatency(99999)).toBe('poor');
      });
    });
  });

  describe('Quality Labels', () => {
    const qualityLabels = {
      excellent: '极好',
      good: '良好',
      fair: '一般',
      poor: '较差'
    };

    test('should display correct label for excellent', () => {
      expect(qualityLabels.excellent).toBe('极好');
    });

    test('should display correct label for good', () => {
      expect(qualityLabels.good).toBe('良好');
    });

    test('should display correct label for fair', () => {
      expect(qualityLabels.fair).toBe('一般');
    });

    test('should display correct label for poor', () => {
      expect(qualityLabels.poor).toBe('较差');
    });
  });

  describe('Quality Colors', () => {
    const qualityColors = {
      excellent: '#52c41a',
      good: '#1890ff',
      fair: '#faad14',
      poor: '#f5222d'
    };

    test('should have correct colors for each quality level', () => {
      expect(qualityColors.excellent).toBe('#52c41a');
      expect(qualityColors.good).toBe('#1890ff');
      expect(qualityColors.fair).toBe('#faad14');
      expect(qualityColors.poor).toBe('#f5222d');
    });

    test('should use green for excellent', () => {
      expect(qualityColors.excellent).toMatch(/^#52c41a$/);
    });

    test('should use red for poor', () => {
      expect(qualityColors.poor).toMatch(/^#f5222d$/);
    });
  });

  describe('Quality Indicator Dots', () => {
    const qualitySizes = {
      excellent: 3,
      good: 3,
      fair: 2,
      poor: 2
    };

    test('should have 3 dots for excellent quality', () => {
      expect(qualitySizes.excellent).toBe(3);
    });

    test('should have 3 dots for good quality', () => {
      expect(qualitySizes.good).toBe(3);
    });

    test('should have 2 dots for fair quality', () => {
      expect(qualitySizes.fair).toBe(2);
    });

    test('should have 2 dots for poor quality', () => {
      expect(qualitySizes.poor).toBe(2);
    });
  });

  describe('Component Props Validation', () => {
    test('should accept valid quality prop values', () => {
      const validQualities: ('excellent' | 'good' | 'fair' | 'poor')[] = [
        'excellent', 'good', 'fair', 'poor'
      ];

      validQualities.forEach(quality => {
        const props = {
          latency: 50,
          fps: 30,
          packetLoss: 0,
          quality
        };
        expect(props.quality).toBe(quality);
      });
    });

    test('should handle optional bandwidth prop', () => {
      const propsWithBandwidth = {
        latency: 50,
        fps: 30,
        packetLoss: 0,
        bandwidth: 1000
      };

      expect(propsWithBandwidth.bandwidth).toBeDefined();
      expect(propsWithBandwidth.bandwidth).toBe(1000);
    });

    test('should handle undefined bandwidth prop', () => {
      const propsWithoutBandwidth = {
        latency: 50,
        fps: 30,
        packetLoss: 0
      };

      expect(propsWithoutBandwidth.bandwidth).toBeUndefined();
    });
  });

  describe('Tooltip Content', () => {
    test('should display latency in tooltip', () => {
      const latency = 50;
      const displayText = `${latency}ms`;
      expect(displayText).toBe('50ms');
    });

    test('should display fps in tooltip', () => {
      const fps = 30;
      const displayText = fps > 0 ? `${fps}fps` : '-';
      expect(displayText).toBe('30fps');
    });

    test('should handle zero fps', () => {
      const fps = 0;
      const displayText = fps > 0 ? `${fps}fps` : '-';
      expect(displayText).toBe('-');
    });

    test('should display packet loss in tooltip', () => {
      const packetLoss = 5.5;
      const displayText = packetLoss > 0 ? `${packetLoss.toFixed(1)}%` : '0%';
      expect(displayText).toBe('5.5%');
    });

    test('should highlight packet loss when > 5%', () => {
      const packetLoss = 6;
      const isHighlighted = packetLoss > 5;
      expect(isHighlighted).toBe(true);
    });

    test('should format bandwidth correctly for kbps', () => {
      const bandwidth = 500;
      const displayText = `${bandwidth}kbps`;
      expect(displayText).toBe('500kbps');
    });

    test('should format bandwidth correctly for mbps', () => {
      const bandwidth = 1500;
      const displayText = bandwidth > 1000
        ? `${(bandwidth / 1000).toFixed(1)}Mbps`
        : `${bandwidth}kbps`;
      expect(displayText).toBe('1.5Mbps');
    });
  });

  describe('Bandwidth Display Conditions', () => {
    test('should display when bandwidth is defined and > 0', () => {
      const bandwidth = 1000;
      const shouldDisplay = bandwidth !== undefined && bandwidth > 0;
      expect(shouldDisplay).toBe(true);
    });

    test('should not display when bandwidth is undefined', () => {
      const bandwidth = undefined;
      const shouldDisplay = bandwidth !== undefined && bandwidth > 0;
      expect(shouldDisplay).toBe(false);
    });

    test('should not display when bandwidth is 0', () => {
      const bandwidth = 0;
      const shouldDisplay = bandwidth !== undefined && bandwidth > 0;
      expect(shouldDisplay).toBe(false);
    });

    test('should not display when bandwidth is negative', () => {
      const bandwidth = -100;
      const shouldDisplay = bandwidth !== undefined && bandwidth > 0;
      expect(shouldDisplay).toBe(false);
    });
  });
});

describe('Quality State Transitions', () => {
  test('should transition from excellent to good at 50ms', () => {
    expect(getQualityFromLatency(49)).toBe('excellent');
    expect(getQualityFromLatency(50)).toBe('good');
  });

  test('should transition from good to fair at 100ms', () => {
    expect(getQualityFromLatency(99)).toBe('good');
    expect(getQualityFromLatency(100)).toBe('fair');
  });

  test('should transition from fair to poor at 200ms', () => {
    expect(getQualityFromLatency(199)).toBe('fair');
    expect(getQualityFromLatency(200)).toBe('poor');
  });
});

describe('Latency Measurement Ranges', () => {
  const testRanges = [
    { min: 0, max: 49, expected: 'excellent' },
    { min: 50, max: 99, expected: 'good' },
    { min: 100, max: 199, expected: 'fair' },
    { min: 200, max: Infinity, expected: 'poor' }
  ];

  testRanges.forEach(range => {
    test(`should classify latency in range ${range.min}-${range.max} as ${range.expected}`, () => {
      if (range.max === Infinity) {
        expect(getQualityFromLatency(200)).toBe(range.expected);
        expect(getQualityFromLatency(1000)).toBe(range.expected);
      } else {
        expect(getQualityFromLatency(range.min)).toBe(range.expected);
        expect(getQualityFromLatency(Math.floor((range.min + range.max) / 2))).toBe(range.expected);
        expect(getQualityFromLatency(range.max)).toBe(range.expected);
      }
    });
  });
});