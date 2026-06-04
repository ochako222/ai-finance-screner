import type { KnownInstrument } from '../database.js';

export const KNOWN_INSTRUMENTS: KnownInstrument[] = [
    // ETFs — Core
    {
        baseTicker: 'VWCE',
        name: 'Vanguard FTSE All-World Acc',
        type: 'ETF',
        market: 'Xetra',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'FTSE All-World'
    },
    {
        baseTicker: 'SPYI',
        name: 'SPDR MSCI ACWI IMI Acc',
        type: 'ETF',
        market: 'Xetra',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'MSCI ACWI IMI'
    },
    {
        baseTicker: 'SWDA',
        name: 'iShares MSCI World Acc',
        type: 'ETF',
        market: 'LSE',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'MSCI World'
    },
    {
        baseTicker: 'IWDA',
        name: 'iShares MSCI World Acc',
        type: 'ETF',
        market: 'Euronext',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'MSCI World'
    },
    {
        baseTicker: 'VHVE',
        name: 'Vanguard FTSE Developed World Acc',
        type: 'ETF',
        market: 'LSE',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'FTSE Developed World'
    },
    // ETFs — US sleeve
    {
        baseTicker: 'CSPX',
        name: 'iShares Core S&P 500 Acc',
        type: 'ETF',
        market: 'LSE',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'S&P 500'
    },
    {
        baseTicker: 'VUAA',
        name: 'Vanguard S&P 500 Acc',
        type: 'ETF',
        market: 'LSE',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'S&P 500'
    },
    // ETFs — EU sleeve
    {
        baseTicker: 'MEUD',
        name: 'Amundi Stoxx Europe 600 Acc',
        type: 'ETF',
        market: 'Euronext Paris',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'Stoxx Europe 600'
    },
    {
        baseTicker: 'EXSA',
        name: 'iShares Stoxx Europe 600 Acc',
        type: 'ETF',
        market: 'Xetra',
        sector: 'Diversified',
        industry: 'Diversified — all sectors',
        indexTracked: 'Stoxx Europe 600'
    },
    // Bonds
    {
        baseTicker: 'AGGH',
        name: 'iShares Global Aggregate Bond EUR-Hedged Acc',
        type: 'Bond',
        market: 'LSE',
        sector: 'Fixed Income',
        industry: 'Fixed Income — Govt + Corp',
        indexTracked: 'Bloomberg Global Aggregate (EUR-hedged)'
    },
    {
        baseTicker: 'IEAG',
        name: 'iShares EUR Aggregate Bond Acc',
        type: 'Bond',
        market: 'LSE',
        sector: 'Fixed Income',
        industry: 'Fixed Income — Govt only',
        indexTracked: 'Bloomberg EUR Aggregate'
    },
    // Stocks
    {
        baseTicker: 'BRKS',
        name: 'Azenta Inc',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Healthcare',
        industry: 'Semiconductor Equipment',
        indexTracked: 'NASDAQ Composite'
    },
    {
        baseTicker: 'BTAI',
        name: 'BioAtla Inc',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Healthcare',
        industry: 'Biotechnology',
        indexTracked: 'NASDAQ Composite'
    },
    {
        baseTicker: 'GRAB',
        name: 'Grab Holdings',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Technology',
        industry: 'Super-App (ride-hail, fintech)',
        indexTracked: 'NASDAQ Composite'
    },
    {
        baseTicker: 'JD',
        name: 'JD.com Inc (ADR)',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Technology',
        industry: 'E-commerce',
        indexTracked: 'NASDAQ-100, NASDAQ Composite'
    },
    {
        baseTicker: 'OTGLY',
        name: 'CD Projekt (ADR)',
        type: 'Stock',
        market: 'OTC',
        sector: 'Technology',
        industry: 'Gaming',
        indexTracked: null
    },
    {
        baseTicker: 'PYPL',
        name: 'PayPal Holdings',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Financial Technology',
        industry: 'Digital Payments',
        indexTracked: 'S&P 500, NASDAQ-100'
    },
    {
        baseTicker: 'COUR',
        name: 'Coursera Inc',
        type: 'Stock',
        market: 'NYSE',
        sector: 'Consumer Discretionary',
        industry: 'Online Education',
        indexTracked: null
    },
    {
        baseTicker: 'DPRO',
        name: 'Draganfly Inc',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Industrials',
        industry: 'Drone Technology',
        indexTracked: null
    },
    {
        baseTicker: 'INDI',
        name: 'Indie Semiconductor',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Technology',
        industry: 'Automotive Semiconductors',
        indexTracked: 'NASDAQ Composite'
    },
    {
        baseTicker: 'PDYN',
        name: 'Palladyne AI Corp',
        type: 'Stock',
        market: 'NYSE',
        sector: 'Technology',
        industry: 'AI & Robotics Software',
        indexTracked: null
    },
    {
        baseTicker: 'STM',
        name: 'STMicroelectronics',
        type: 'Stock',
        market: 'NYSE',
        sector: 'Technology',
        industry: 'Semiconductors',
        indexTracked: 'Stoxx Europe 600, CAC 40'
    },
    {
        baseTicker: 'TORM',
        name: 'TORM plc',
        type: 'Stock',
        market: 'NASDAQ',
        sector: 'Energy',
        industry: 'Product Tanker Shipping',
        indexTracked: null
    }
];
