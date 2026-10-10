import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatTime, formatDuration, getInitials, truncate } from '@utils'

describe('Utility Functions', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('base', 'extra')).toBe('base extra')
      expect(cn('base', false && 'conditional')).toBe('base')
      expect(cn('base', { conditional: true })).toBe('base conditional')
    })

    it('should handle tailwind merge', () => {
      expect(cn('p-2 p-4')).toBe('p-4')
      expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    })
  })

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const date = '2024-01-15'
      const result = formatDate(date)
      expect(result).toContain('Jan')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15')
      const result = formatDate(date)
      expect(result).toContain('Jan')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })
  })

  describe('formatTime', () => {
    it('should format seconds to minutes and seconds', () => {
      expect(formatTime(90)).toBe('1m 30s')
      expect(formatTime(45)).toBe('45s')
      expect(formatTime(3661)).toBe('61m 1s')
    })
  })

  describe('formatDuration', () => {
    it('should format minutes to human readable', () => {
      expect(formatDuration(30)).toBe('30 min')
      expect(formatDuration(90)).toBe('1h 30m')
      expect(formatDuration(150)).toBe('2h 30m')
    })
  })

  describe('getInitials', () => {
    it('should extract initials from name', () => {
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('Priya Sharma')).toBe('PS')
      expect(getInitials('A')).toBe('A')
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 8)).toBe('Hello Wo...')
      expect(truncate('Short', 10)).toBe('Short')
      expect(truncate('', 5)).toBe('')
    })
  })
})