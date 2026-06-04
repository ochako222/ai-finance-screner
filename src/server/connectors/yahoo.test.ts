import { describe, expect, it } from 'vitest';
import { quoteTypeToAssetType, t212ToYahoo } from './yahoo.js';

describe('t212ToYahoo', () => {
    it.each([
        ['AAPL_US_EQ', 'AAPL'],
        ['VOO_US_EQ', 'VOO'],
        ['VWCE_GY_ETF', 'VWCE.DE'],
        ['CSPX_LN_ETF', 'CSPX.L'],
        ['MEUD_PA_ETF', 'MEUD.PA'],
        ['AGGH_LN_ETF', 'AGGH.L'],
        ['SAP_DE_EQ', 'SAP.DE'],
        ['BARC_UK_EQ', 'BARC.L'],
        ['BARC_GB_EQ', 'BARC.L'],
        ['ASML_NL_EQ', 'ASML.AS'],
        ['ENI_IT_EQ', 'ENI.MI'],
        ['IBE_ES_EQ', 'IBE.MC'],
        ['XYZ_ZZ_EQ', 'XYZ'],
        ['BAREXAMPLE', 'BAREXAMPLE']
    ])('%s → %s', (input, expected) => {
        expect(t212ToYahoo(input)).toBe(expected);
    });
});

describe('quoteTypeToAssetType', () => {
    it('maps ETF', () => expect(quoteTypeToAssetType('ETF')).toBe('ETF'));
    it('maps EQUITY', () => expect(quoteTypeToAssetType('EQUITY')).toBe('Stock'));
    it('falls back for MUTUALFUND', () =>
        expect(quoteTypeToAssetType('MUTUALFUND')).toBe('Unknown'));
    it('falls back for null', () => expect(quoteTypeToAssetType(null)).toBe('Unknown'));
    it('falls back for undefined', () => expect(quoteTypeToAssetType(undefined)).toBe('Unknown'));
    it('falls back for empty string', () => expect(quoteTypeToAssetType('')).toBe('Unknown'));
});
