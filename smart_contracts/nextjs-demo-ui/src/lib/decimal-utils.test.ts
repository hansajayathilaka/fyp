import { describe, it, expect } from 'vitest'
import { formatAmount, formatAmountForDisplay, safeFormatAmount } from './decimal-utils'

describe('Decimal Utils', () => {
  describe('formatAmount', () => {
    it('should format blockchain amounts correctly', () => {
      // Standard amount (1.5 ETH)
      expect(formatAmount(BigInt('1500000000000000000'))).toBe('1.5')
    })

    it('should handle zero amounts', () => {
      expect(formatAmount(BigInt('0'))).toBe('0.0')
    })
  })

  describe('formatAmountForDisplay', () => {
    it('should format with limited decimal places', () => {
      // ~1.234 ETH
      expect(formatAmountForDisplay(BigInt('1234567890123456789'), 4)).toMatch(/^1\.234[56]?$/)
    })

    it('should handle zero amounts', () => {
      expect(formatAmountForDisplay(BigInt('0'))).toBe('0')
    })

    it('should remove trailing zeros', () => {
      // 1.0 ETH
      expect(formatAmountForDisplay(BigInt('1000000000000000000'))).toBe('1')
    })

    it('should handle very small amounts without scientific notation', () => {
      // Very small amount
      const result = formatAmountForDisplay(BigInt('1000000000000'), 6)
      expect(result).not.toContain('e')
      expect(result).not.toContain('E')
    })
  })

  describe('safeFormatAmount', () => {
    it('should format valid amounts', () => {
      // 1 ETH
      expect(safeFormatAmount(BigInt('1000000000000000000'))).toBe('1.0')
    })

    it('should handle errors gracefully', () => {
      // This test is more about ensuring no exceptions are thrown
      const result = safeFormatAmount(BigInt('123'))
      expect(typeof result).toBe('string')
    })
  })
})