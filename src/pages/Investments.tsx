import { useState, useEffect, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, LineChart, Line } from 'recharts';
import { Plus, Trash2, Edit2, X, Check, TrendingUp, TrendingDown, Download, RefreshCw } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import { getTotalInvestmentValue, getTotalInvestmentCost, getInvestmentReturn } from '../utils/calculations';
import { Investment, InvestmentType, AutoInvestConfig, InvestmentPlatform, PurchaseRecord } from '../types';

// Computes the next date an auto-invest contribution is due, after `from`.
function nextAutoInvestOccurrence(from: Date, config: AutoInvestConfig): Date {
  const next = new Date(from);
  if (config.frequency === 'weekly') {
    next.setDate(next.getDate() + 1);
    while (next.getDay() !== config.dayOfWeek) next.setDate(next.getDate() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
    next.setDate(config.dayOfMonth ?? 1);
  }
  return next;
}

// Real holdings extracted from StashAway (May 2026 statement), Tiger Brokers
// (Jan-Jun 2026 activity statement, SGD positions converted to USD at the
// statement's 0.7799 SGD->USD rate), and Coinbase (XRP buy on 5 Feb 2026).
const REAL_HOLDINGS: Omit<Investment, 'id'>[] = [
  // StashAway Flexible Portfolio (reported natively in USD)
  { name: 'First Trust NASDAQ Clean Edge Smart Grid Infrastructure (GRID)', ticker: 'GRID', type: 'etf', units: 6.4707, buyPrice: 109.2293, currentPrice: 193.07, purchaseDate: '2023-01-31', color: '#10b981', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since the account's first contribution in Jan 2023, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2023-01-31', price: 88.8889, units: 0.1188, amount: 10.56 }, { date: '2023-02-28', price: 95.0293, units: 0.4607, amount: 43.78 }, { date: '2023-03-31', price: 94.9367, units: 0.0158, amount: 1.5 }, { date: '2023-04-30', price: 97.4207, units: 0.2365, amount: 23.04 }, { date: '2023-05-31', price: 96.2457, units: 0.2344, amount: 22.56 }, { date: '2023-06-30', price: 100.8276, units: 0.2175, amount: 21.93 }, { date: '2023-07-31', price: 105.0195, units: 0.2052, amount: 21.55 }, { date: '2023-08-31', price: 102.8037, units: 0.4708, amount: 48.4 }, { date: '2023-09-30', price: 100.4717, units: 0.0212, amount: 2.13 }, { date: '2023-10-31', price: 93.2572, units: 0.2714, amount: 25.31 }, { date: '2023-11-30', price: 86.5985, units: 0.3425, amount: 29.66 }, { date: '2023-12-31', price: 96.4776, units: 0.1675, amount: 16.16 }, { date: '2024-01-31', price: 103.3104, units: 0.1601, amount: 16.54 }, { date: '2024-02-29', price: 101.8736, units: 0.2722, amount: 27.73 }, { date: '2024-03-31', price: 109.8476, units: 0.1706, amount: 18.74 }, { date: '2024-04-30', price: 114.5179, units: 0.1784, amount: 20.43 }, { date: '2024-05-31', price: 112.0668, units: 0.1616, amount: 18.11 }, { date: '2024-06-30', price: 120.3505, units: 0.1027, amount: 12.36 }, { date: '2024-07-31', price: 116.1509, units: 0.3393, amount: 39.41 }, { date: '2024-08-31', price: 113.4379, units: 0.2932, amount: 33.26 }, { date: '2024-09-30', price: 121.3174, units: 0.0835, amount: 10.13 }, { date: '2024-10-31', price: 127.5754, units: 0.0961, amount: 12.26 }, { date: '2024-11-30', price: 122.2809, units: 0.3218, amount: 39.35 }, { date: '2024-12-31', price: 126.0274, units: 0.1314, amount: 16.56 }, { date: '2025-01-31', price: 120.1786, units: 0.224, amount: 26.92 }, { date: '2025-02-28', price: 117.8723, units: 0.3525, amount: 41.55 }, { date: '2025-03-31', price: 114.0885, units: 0.2825, amount: 32.23 }, { date: '2025-04-30', price: 112.6904, units: 0.2167, amount: 24.42 }, { date: '2025-07-31', price: 138.1471, units: 0.0367, amount: 5.07 }, { date: '2025-08-31', price: 142.6778, units: 0.0478, amount: 6.82 }, { date: '2025-09-30', price: 148.4605, units: 0.0747, amount: 11.09 }, { date: '2026-01-31', price: 167.4662, units: 0.1626, amount: 27.23 }] },
  { name: 'Consumer Discretionary Select Sector SPDR (XLY)', ticker: 'XLY', type: 'etf', units: 3.1296, buyPrice: 94.5952, currentPrice: 120.87, purchaseDate: '2023-01-31', color: '#3b82f6', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since the account's first contribution in Jan 2023, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2023-01-31', price: 129.9492, units: 0.0591, amount: 7.68 }, { date: '2023-02-28', price: 147.2861, units: 0.2174, amount: 32.02 }, { date: '2023-03-31', price: 144.1176, units: 0.0068, amount: 0.98 }, { date: '2023-04-30', price: 148.2523, units: 0.1173, amount: 17.39 }, { date: '2023-05-31', price: 146.2014, units: 0.1132, amount: 16.55 }, { date: '2023-06-30', price: 156.8828, units: 0.0879, amount: 13.79 }, { date: '2023-07-31', price: 171.5318, units: 0.0692, amount: 11.87 }, { date: '2023-08-31', price: 171.3519, units: 0.1864, amount: 31.94 }, { date: '2023-09-30', price: 176.9231, units: 0.0013, amount: 0.23 }, { date: '2023-10-31', price: 160.0427, units: 0.0936, amount: 14.98 }, { date: '2023-11-30', price: 153.1696, units: 0.1262, amount: 19.33 }, { date: '2023-12-31', price: 168.1034, units: 0.0812, amount: 13.65 }, { date: '2024-01-31', price: 178.1996, units: 0.0922, amount: 16.43 }, { date: '2024-02-29', price: 175.8478, units: 0.1209, amount: 21.26 }, { date: '2024-03-31', price: 183.792, units: 0.0981, amount: 18.03 }, { date: '2024-04-30', price: 183.6304, units: 0.1515, amount: 27.82 }, { date: '2024-05-31', price: 175.7372, units: 0.1187, amount: 20.86 }, { date: '2024-06-30', price: 175.9916, units: 0.1437, amount: 25.29 }, { date: '2024-07-31', price: 182.8154, units: 0.0547, amount: 10.0 }, { date: '2024-08-31', price: 167.6728, units: 0.1259, amount: 21.11 }, { date: '2024-09-30', price: 186.5854, units: 0.0902, amount: 16.83 }, { date: '2024-11-30', price: 199.3377, units: 0.0604, amount: 12.04 }, { date: '2025-04-30', price: 194.3925, units: 0.0749, amount: 14.56 }, { date: '2025-05-31', price: 200.0, units: 0.0109, amount: 2.18 }, { date: '2025-06-30', price: 214.6965, units: 0.0313, amount: 6.72 }, { date: '2025-07-31', price: 218.4669, units: 0.0287, amount: 6.27 }, { date: '2025-08-31', price: 217.5309, units: 0.0405, amount: 8.81 }, { date: '2026-01-31', price: 122.3932, units: 0.1755, amount: 21.48 }, { date: '2026-02-28', price: 121.4286, units: 0.0028, amount: 0.34 }, { date: '2026-04-30', price: 116.6129, units: 0.186, amount: 21.69 }, { date: '2026-05-31', price: 118.9911, units: 0.1011, amount: 12.03 }] },
  { name: 'VanEck Environmental Services ETF (EVX)', ticker: 'EVX', type: 'etf', units: 28.0577, buyPrice: 33.8121, currentPrice: 38.83, purchaseDate: '2023-01-31', color: '#f59e0b', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since the account's first contribution in Jan 2023, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2023-01-31', price: 135.8268, units: 0.0762, amount: 10.35 }, { date: '2023-02-28', price: 144.9587, units: 0.3025, amount: 43.85 }, { date: '2023-03-31', price: 143.0, units: 0.01, amount: 1.43 }, { date: '2023-04-30', price: 144.9852, units: 0.1685, amount: 24.43 }, { date: '2023-05-31', price: 142.776, units: 0.1585, amount: 22.63 }, { date: '2023-06-30', price: 148.3007, units: 0.153, amount: 22.69 }, { date: '2023-07-31', price: 160.7073, units: 0.1018, amount: 16.36 }, { date: '2023-08-31', price: 159.3318, units: 0.2963, amount: 47.21 }, { date: '2023-09-30', price: 157.0552, units: 0.0163, amount: 2.56 }, { date: '2023-10-31', price: 141.9714, units: 0.1887, amount: 26.79 }, { date: '2023-11-30', price: 134.9084, units: 0.2074, amount: 27.98 }, { date: '2023-12-31', price: 144.4934, units: 0.1589, amount: 22.96 }, { date: '2024-01-31', price: 151.4151, units: 0.1696, amount: 25.68 }, { date: '2024-02-29', price: 149.2826, units: 0.1812, amount: 27.05 }, { date: '2024-03-31', price: 162.4615, units: 0.0975, amount: 15.84 }, { date: '2024-04-30', price: 166.4996, units: 0.1397, amount: 23.26 }, { date: '2024-05-31', price: 162.1967, units: 0.1566, amount: 25.4 }, { date: '2024-06-30', price: 167.4651, units: 0.1503, amount: 25.17 }, { date: '2024-07-31', price: 170.1506, units: 0.1129, amount: 19.21 }, { date: '2024-08-31', price: 174.5146, units: 0.0412, amount: 7.19 }, { date: '2024-09-30', price: 178.63, units: 0.1708, amount: 30.51 }, { date: '2024-10-31', price: 180.6974, units: 0.2036, amount: 36.79 }, { date: '2024-11-30', price: 181.8713, units: 0.0684, amount: 12.44 }, { date: '2024-12-31', price: 180.4408, units: 0.0363, amount: 6.55 }, { date: '2025-01-31', price: 172.842, units: 0.2931, amount: 50.66 }, { date: '2025-03-31', price: 35.7002, units: 0.1014, amount: 3.62 }, { date: '2025-04-30', price: 35.1113, units: 0.7368, amount: 25.87 }, { date: '2025-05-31', price: 35.9886, units: 0.5988, amount: 21.55 }, { date: '2025-06-30', price: 37.8497, units: 0.8436, amount: 31.93 }, { date: '2025-07-31', price: 38.2377, units: 0.6219, amount: 23.78 }, { date: '2025-08-31', price: 38.2809, units: 0.6771, amount: 25.92 }, { date: '2025-09-30', price: 38.2628, units: 1.7453, amount: 66.78 }, { date: '2026-01-31', price: 40.9018, units: 1.3085, amount: 53.52 }, { date: '2026-02-28', price: 40.3226, units: 0.0186, amount: 0.75 }, { date: '2026-04-30', price: 40.1594, units: 1.0035, amount: 40.3 }, { date: '2026-05-31', price: 39.4952, units: 1.3232, amount: 52.26 }] },
  { name: 'VanEck Semiconductor ETF (SMH)', ticker: 'SMH', type: 'etf', units: 2.0157, buyPrice: 185.0706, currentPrice: 598.93, purchaseDate: '2023-01-31', color: '#8b5cf6', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since the account's first contribution in Jan 2023, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2023-01-31', price: 205.0881, units: 0.0511, amount: 10.48 }, { date: '2023-02-28', price: 238.4702, units: 0.1778, amount: 42.4 }, { date: '2023-03-31', price: 241.3793, units: 0.0058, amount: 1.4 }, { date: '2023-04-30', price: 262.0321, units: 0.0748, amount: 19.6 }, { date: '2023-06-30', price: 144.9139, units: 0.0639, amount: 9.26 }, { date: '2023-07-31', price: 153.1646, units: 0.1264, amount: 19.36 }, { date: '2023-08-31', price: 156.849, units: 0.2577, amount: 40.42 }, { date: '2023-09-30', price: 146.1538, units: 0.0039, amount: 0.57 }, { date: '2023-10-31', price: 145.2474, units: 0.1536, amount: 22.31 }, { date: '2023-11-30', price: 139.1075, units: 0.1703, amount: 23.69 }, { date: '2023-12-31', price: 159.8372, units: 0.0737, amount: 11.78 }, { date: '2024-01-31', price: 170.0803, units: 0.0996, amount: 16.94 }, { date: '2024-04-30', price: 225.2294, units: 0.0218, amount: 4.91 }, { date: '2024-05-31', price: 209.3372, units: 0.1735, amount: 36.32 }, { date: '2024-08-31', price: 209.8467, units: 0.261, amount: 54.77 }, { date: '2024-09-30', price: 230.0971, units: 0.0618, amount: 14.22 }, { date: '2024-10-31', price: 244.4444, units: 0.1152, amount: 28.16 }, { date: '2024-11-30', price: 244.7154, units: 0.0615, amount: 15.05 }, { date: '2024-12-31', price: 243.6773, units: 0.1376, amount: 33.53 }, { date: '2025-01-31', price: 244.3878, units: 0.0196, amount: 4.79 }, { date: '2025-02-28', price: 238.7894, units: 0.1173, amount: 28.01 }, { date: '2025-03-31', price: 222.2064, units: 0.2801, amount: 62.24 }, { date: '2025-04-30', price: 205.7962, units: 0.5055, amount: 104.03 }] },
  { name: 'First Trust Water ETF (FIW)', ticker: 'FIW', type: 'etf', units: 7.0031, buyPrice: 99.0471, currentPrice: 103.74, purchaseDate: '2023-01-31', color: '#06b6d4', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since the account's first contribution in Jan 2023, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2023-01-31', price: 79.8165, units: 0.0872, amount: 6.96 }, { date: '2023-02-28', price: 84.23, units: 0.3513, amount: 29.59 }, { date: '2023-03-31', price: 83.3333, units: 0.0114, amount: 0.95 }, { date: '2023-04-30', price: 83.4511, units: 0.1982, amount: 16.54 }, { date: '2023-05-31', price: 82.3177, units: 0.1838, amount: 15.13 }, { date: '2023-06-30', price: 84.5372, units: 0.1869, amount: 15.8 }, { date: '2023-07-31', price: 88.1011, units: 0.1622, amount: 14.29 }, { date: '2023-09-30', price: 89.9225, units: 0.0129, amount: 1.16 }, { date: '2023-10-31', price: 82.2821, units: 0.2077, amount: 17.09 }, { date: '2023-11-30', price: 78.4499, units: 0.2116, amount: 16.6 }, { date: '2023-12-31', price: 87.865, units: 0.1096, amount: 9.63 }, { date: '2024-01-31', price: 94.1456, units: 0.1264, amount: 11.9 }, { date: '2024-02-29', price: 92.9607, units: 0.1932, amount: 17.96 }, { date: '2024-03-31', price: 98.6902, units: 0.1527, amount: 15.07 }, { date: '2024-04-30', price: 102.1805, units: 0.1651, amount: 16.87 }, { date: '2024-05-31', price: 100.4367, units: 0.1145, amount: 11.5 }, { date: '2024-06-30', price: 102.8493, units: 0.1825, amount: 18.77 }, { date: '2024-07-31', price: 99.8111, units: 0.2647, amount: 26.42 }, { date: '2024-09-30', price: 107.0222, units: 0.1894, amount: 20.27 }, { date: '2024-10-31', price: 109.1686, units: 0.1756, amount: 19.17 }, { date: '2024-11-30', price: 105.8534, units: 0.2033, amount: 21.52 }, { date: '2024-12-31', price: 109.3126, units: 0.0902, amount: 9.86 }, { date: '2025-01-31', price: 102.5301, units: 0.2411, amount: 24.72 }, { date: '2025-02-28', price: 104.3591, units: 0.1537, amount: 16.04 }, { date: '2025-03-31', price: 102.5173, units: 0.1589, amount: 16.29 }, { date: '2025-04-30', price: 100.086, units: 0.2325, amount: 23.27 }, { date: '2025-05-31', price: 102.6846, units: 0.1341, amount: 13.77 }, { date: '2025-06-30', price: 106.2796, units: 0.2532, amount: 26.91 }, { date: '2025-07-31', price: 109.8039, units: 0.0969, amount: 10.64 }, { date: '2025-08-31', price: 109.7762, units: 0.1698, amount: 18.64 }, { date: '2025-09-30', price: 109.8496, units: 0.3523, amount: 38.7 }, { date: '2026-01-31', price: 113.2155, units: 0.4245, amount: 48.06 }, { date: '2026-02-28', price: 112.3077, units: 0.0065, amount: 0.73 }, { date: '2026-04-30', price: 108.6499, units: 0.4185, amount: 45.47 }, { date: '2026-05-31', price: 104.3505, units: 0.485, amount: 50.61 }] },
  { name: 'SPDR Gold MiniShares Trust (GLDM)', ticker: 'GLDM', type: 'etf', units: 11.7943, buyPrice: 67.7272, currentPrice: 89.93, purchaseDate: '2025-06-30', color: '#ef4444', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since this position replaced the old Gold Trust (GLD) holding in Jun 2025, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2025-06-30', price: 65.861, units: 11.0627, amount: 728.6 }, { date: '2025-07-31', price: 66.2161, units: 1.1171, amount: 73.97 }, { date: '2025-08-31', price: 66.8365, units: 0.6281, amount: 41.98 }, { date: '2026-02-28', price: 92.8571, units: 0.0168, amount: 1.56 }, { date: '2026-04-30', price: 95.1338, units: 0.5754, amount: 54.74 }, { date: '2026-05-31', price: 92.6514, units: 0.6491, amount: 60.14 }] },
  { name: 'iShares Global Healthcare ETF (IXJ)', ticker: 'IXJ', type: 'etf', units: 8.0062, buyPrice: 88.6457, currentPrice: 94.50, purchaseDate: '2023-01-31', color: '#ec4899', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since the account's first contribution in Jan 2023, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2023-01-31', price: 85.4071, units: 0.0651, amount: 5.56 }, { date: '2023-02-28', price: 82.7645, units: 0.293, amount: 24.25 }, { date: '2023-03-31', price: 80.4511, units: 0.0133, amount: 1.07 }, { date: '2023-04-30', price: 83.6031, units: 0.1421, amount: 11.88 }, { date: '2023-05-31', price: 86.5272, units: 0.1195, amount: 10.34 }, { date: '2023-06-30', price: 84.8045, units: 0.179, amount: 15.18 }, { date: '2023-07-31', price: 84.2975, units: 0.1815, amount: 15.3 }, { date: '2023-09-30', price: 85.641, units: 0.0195, amount: 1.67 }, { date: '2023-10-31', price: 82.0488, units: 0.1025, amount: 8.41 }, { date: '2023-11-30', price: 79.3758, units: 0.1634, amount: 12.97 }, { date: '2023-12-31', price: 83.6925, units: 0.2042, amount: 17.09 }, { date: '2024-01-31', price: 86.2903, units: 0.1488, amount: 12.84 }, { date: '2024-02-29', price: 89.3688, units: 0.0903, amount: 8.07 }, { date: '2024-03-31', price: 91.8565, units: 0.1756, amount: 16.13 }, { date: '2024-04-30', price: 92.868, units: 0.1977, amount: 18.36 }, { date: '2024-05-31', price: 89.4606, units: 0.1613, amount: 14.43 }, { date: '2024-06-30', price: 91.9306, units: 0.1326, amount: 12.19 }, { date: '2024-07-31', price: 92.9023, units: 0.1423, amount: 13.22 }, { date: '2024-08-31', price: 96.6851, units: 0.0543, amount: 5.25 }, { date: '2024-09-30', price: 100.9009, units: 0.0777, amount: 7.84 }, { date: '2024-10-31', price: 98.1902, units: 0.2818, amount: 27.67 }, { date: '2024-11-30', price: 93.6398, units: 0.261, amount: 24.44 }, { date: '2024-12-31', price: 92.0507, units: 0.2365, amount: 21.77 }, { date: '2025-01-31', price: 86.3263, units: 0.2311, amount: 19.95 }, { date: '2025-02-28', price: 90.7563, units: 0.0476, amount: 4.32 }, { date: '2025-03-31', price: 90.1408, units: 0.0142, amount: 1.28 }, { date: '2025-04-30', price: 89.7638, units: 1.3462, amount: 120.84 }, { date: '2025-05-31', price: 88.7984, units: 0.258, amount: 22.91 }, { date: '2025-06-30', price: 85.5085, units: 0.6735, amount: 57.59 }, { date: '2025-07-31', price: 86.5375, units: 0.1961, amount: 16.97 }, { date: '2025-08-31', price: 83.8345, units: 0.3359, amount: 28.16 }, { date: '2025-09-30', price: 86.6259, units: 0.4419, amount: 38.28 }, { date: '2026-01-31', price: 98.6486, units: 0.0888, amount: 8.76 }, { date: '2026-04-30', price: 95.692, units: 0.2182, amount: 20.88 }, { date: '2026-05-31', price: 91.4701, units: 0.4748, amount: 43.43 }] },
  { name: 'iShares US Aggregate Bond UCITS ETF (IUAG)', ticker: 'IUAG', type: 'etf', units: 3.9254, buyPrice: 93.5061, currentPrice: 93.31, purchaseDate: '2023-08-31', color: '#84cc16', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since this position replaced the old Aggregate Bond (AGG) holding in Aug 2023, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2023-08-31', price: 91.6062, units: 1.4332, amount: 131.29 }, { date: '2023-09-30', price: 92.3077, units: 0.0117, amount: 1.08 }, { date: '2023-10-31', price: 89.6804, units: 0.1095, amount: 9.82 }, { date: '2023-11-30', price: 88.7762, units: 0.1479, amount: 13.13 }, { date: '2023-12-31', price: 91.6431, units: 0.2477, amount: 22.7 }, { date: '2024-01-31', price: 93.9122, units: 0.2004, amount: 18.82 }, { date: '2024-02-29', price: 94.0239, units: 0.1757, amount: 16.52 }, { date: '2024-03-31', price: 92.9309, units: 0.3098, amount: 28.79 }, { date: '2024-04-30', price: 93.2087, units: 0.2032, amount: 18.94 }, { date: '2024-05-31', price: 91.3632, units: 0.2142, amount: 19.57 }, { date: '2024-06-30', price: 90.9583, units: 0.2588, amount: 23.54 }, { date: '2024-07-31', price: 91.8429, units: 0.0993, amount: 9.12 }, { date: '2024-08-31', price: 94.9689, units: 0.1928, amount: 18.31 }, { date: '2024-09-30', price: 95.8403, units: 0.238, amount: 22.81 }, { date: '2024-10-31', price: 97.1227, units: 0.1981, amount: 19.24 }, { date: '2024-11-30', price: 94.2698, units: 0.2513, amount: 23.69 }, { date: '2024-12-31', price: 93.2956, units: 0.2476, amount: 23.1 }, { date: '2025-01-31', price: 92.3899, units: 0.0749, amount: 6.92 }, { date: '2025-02-28', price: 92.0666, units: 0.2521, amount: 23.21 }, { date: '2025-04-30', price: 94.1606, units: 0.0411, amount: 3.87 }, { date: '2025-05-31', price: 94.8698, units: 0.1306, amount: 12.39 }, { date: '2025-06-30', price: 92.7973, units: 0.3221, amount: 29.89 }, { date: '2025-07-31', price: 93.2692, units: 0.104, amount: 9.7 }, { date: '2025-08-31', price: 94.1874, units: 0.0843, amount: 7.94 }, { date: '2025-09-30', price: 95.8417, units: 0.1996, amount: 19.13 }, { date: '2025-10-31', price: 96.1538, units: 0.0026, amount: 0.25 }, { date: '2026-01-31', price: 94.8219, units: 0.3341, amount: 31.68 }, { date: '2026-02-28', price: 95.5556, units: 0.0045, amount: 0.43 }, { date: '2026-04-30', price: 95.3375, units: 0.1437, amount: 13.7 }, { date: '2026-05-31', price: 95.1511, units: 0.1588, amount: 15.11 }] },
  { name: 'iShares Core S&P 500 ETF (IVV)', ticker: 'IVV', type: 'etf', units: 0.9254, buyPrice: 572.6389, currentPrice: 760.05, purchaseDate: '2025-03-31', color: '#10b981', platform: 'StashAway', notes: "StashAway Flexible Portfolio. Cost basis is the running average cost since this position was added in Mar 2025, reconstructed from every monthly statement (handles partial trims/rebalances using the average-cost method).", purchaseHistory: [{ date: '2025-03-31', price: 554.668, units: 0.4006, amount: 222.2 }, { date: '2025-04-30', price: 558.2928, units: 0.3702, amount: 206.68 }, { date: '2025-05-31', price: 564.7541, units: 0.0122, amount: 6.89 }, { date: '2025-06-30', price: 597.9592, units: 0.0245, amount: 14.65 }, { date: '2025-07-31', price: 619.1176, units: 0.0136, amount: 8.42 }, { date: '2025-08-31', price: 627.8481, units: 0.0158, amount: 9.92 }, { date: '2025-09-30', price: 660.5634, units: 0.0142, amount: 9.38 }, { date: '2026-01-31', price: 695.9746, units: 0.0472, amount: 32.85 }, { date: '2026-02-28', price: 671.4286, units: 0.0007, amount: 0.47 }, { date: '2026-04-30', price: 698.4674, units: 0.0261, amount: 18.23 }, { date: '2026-05-31', price: 766.6667, units: 0.0003, amount: 0.23 }] },
  // Tiger Brokers - unit trusts (priced and traded in SGD; buyPrice/currentPrice above
  // are converted to USD at 0.7799 so portfolio totals are all in one currency, but the
  // purchase history below keeps each order's native SGD price/amount to match your statement)
  {
    name: 'Eastspring Japan Dynamic AS (SGDHDG)', type: 'mutual_fund', units: 200.638, buyPrice: 25.65, currentPrice: 43.15, purchaseDate: '2026-01-06', color: '#3b82f6', platform: 'Tiger Brokers',
    notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$32.89, current S$55.32/unit). Cost basis is the weighted average of every DCA order below.',
    purchaseHistory: [
      { date: '2024-02-14', price: 29.538, units: 60.938, amount: 1800.00, currency: 'SGD' },
      { date: '2024-03-01', price: 30.519, units: 6.553, amount: 199.99, currency: 'SGD' },
      { date: '2024-03-31', price: 31.414, units: 6.367, amount: 200.00, currency: 'SGD' },
      { date: '2024-04-30', price: 32.206, units: 6.21, amount: 200.00, currency: 'SGD' },
      { date: '2024-06-01', price: 32.867, units: 6.085, amount: 200.00, currency: 'SGD' },
      { date: '2024-07-01', price: 32.640, units: 6.127, amount: 199.99, currency: 'SGD' },
      { date: '2024-08-01', price: 30.228, units: 6.616, amount: 199.99, currency: 'SGD' },
      { date: '2024-09-01', price: 31.788, units: 6.292, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-30', price: 31.730, units: 6.303, amount: 199.99, currency: 'SGD' },
      { date: '2024-11-01', price: 32.444, units: 6.164, amount: 199.98, currency: 'SGD' },
      { date: '2024-12-01', price: 32.823, units: 6.092, amount: 199.96, currency: 'SGD' },
      { date: '2024-12-31', price: 33.532, units: 5.964, amount: 199.98, currency: 'SGD' },
      { date: '2025-02-01', price: 32.589, units: 6.137, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-03', price: 33.422, units: 5.984, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-31', price: 33.743, units: 5.927, amount: 199.99, currency: 'SGD' },
      { date: '2025-05-02', price: 32.996, units: 6.061, amount: 199.99, currency: 'SGD' },
      { date: '2025-05-31', price: 33.168, units: 6.03, amount: 200.00, currency: 'SGD' },
      { date: '2025-07-01', price: 34.174, units: 5.852, amount: 199.99, currency: 'SGD' },
      { date: '2025-07-31', price: 35.508, units: 5.633, amount: 199.99, currency: 'SGD' },
      { date: '2025-08-30', price: 37.733, units: 5.3, amount: 199.98, currency: 'SGD' },
      { date: '2025-09-30', price: 38.346, units: 5.216, amount: 200.00, currency: 'SGD' },
      { date: '2025-10-31', price: 40.013, units: 4.998, amount: 199.98, currency: 'SGD' },
      { date: '2025-11-28', price: 41.548, units: 4.814, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-01', price: 43.607, units: 4.586, amount: 199.98, currency: 'SGD' },
      { date: '2026-01-31', price: 45.566, units: 4.389, amount: 199.99, currency: 'SGD' },
    ],
  },
  { name: 'Schroder ISF Global Gold A (SGDHDG)', type: 'mutual_fund', units: 4.17, buyPrice: 261.48, currentPrice: 385.14, purchaseDate: '2026-01-01', color: '#f59e0b', platform: 'Tiger Brokers', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$335.27, current S$493.83/unit).', purchaseHistory: [{ date: '2026-01-01', price: 335.27, units: 4.17, amount: 1398.08, currency: 'SGD' }] },
  {
    name: 'Abrdn Global Technology (SGD)', type: 'mutual_fund', units: 2936.34, buyPrice: 1.59, currentPrice: 2.39, purchaseDate: '2026-01-05', color: '#8b5cf6', platform: 'Tiger Brokers',
    notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$2.04, current S$3.06/unit). Cost basis is the weighted average of every DCA order below.',
    purchaseHistory: [
      { date: '2023-12-03', price: 1.6501, units: 242.41, amount: 400.00, currency: 'SGD' },
      { date: '2023-12-29', price: 1.6871, units: 237.09, amount: 400.00, currency: 'SGD' },
      { date: '2024-02-14', price: 1.8395, units: 217.45, amount: 400.00, currency: 'SGD' },
      { date: '2024-03-01', price: 1.9934, units: 100.33, amount: 200.00, currency: 'SGD' },
      { date: '2024-03-31', price: 2.0067, units: 99.67, amount: 200.00, currency: 'SGD' },
      { date: '2024-04-30', price: 1.9064, units: 104.91, amount: 200.00, currency: 'SGD' },
      { date: '2024-06-01', price: 2.0011, units: 99.95, amount: 200.00, currency: 'SGD' },
      { date: '2024-07-01', price: 2.1344, units: 93.7, amount: 199.99, currency: 'SGD' },
      { date: '2024-08-01', price: 1.8691, units: 107, amount: 199.99, currency: 'SGD' },
      { date: '2024-09-01', price: 1.9497, units: 102.58, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-30', price: 1.9829, units: 100.86, amount: 200.00, currency: 'SGD' },
      { date: '2024-11-01', price: 2.0646, units: 96.87, amount: 200.00, currency: 'SGD' },
      { date: '2024-12-01', price: 2.2452, units: 89.08, amount: 200.00, currency: 'SGD' },
      { date: '2024-12-31', price: 2.2877, units: 87.43, amount: 200.00, currency: 'SGD' },
      { date: '2025-02-01', price: 2.2986, units: 87.03, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-03', price: 2.098, units: 95.33, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-31', price: 1.9897, units: 100.52, amount: 200.00, currency: 'SGD' },
      { date: '2025-05-02', price: 1.9942, units: 100.29, amount: 200.00, currency: 'SGD' },
      { date: '2025-05-31', price: 2.0988, units: 95.29, amount: 199.99, currency: 'SGD' },
      { date: '2025-07-01', price: 2.1898, units: 91.33, amount: 199.99, currency: 'SGD' },
      { date: '2025-07-01', price: 2.2304, units: 89.67, amount: 200.00, currency: 'SGD' },
      { date: '2025-08-30', price: 2.288, units: 87.41, amount: 199.99, currency: 'SGD' },
      { date: '2025-09-30', price: 2.4456, units: 81.78, amount: 200.00, currency: 'SGD' },
      { date: '2025-10-31', price: 2.5316, units: 79, amount: 200.00, currency: 'SGD' },
      { date: '2025-11-28', price: 2.3787, units: 84.08, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-01', price: 2.4313, units: 82.26, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-31', price: 2.4092, units: 83.02, amount: 200.00, currency: 'SGD' },
    ],
  },
  {
    name: 'UOB United e-Commerce (SGD)', type: 'mutual_fund', units: 6458.26, buyPrice: 0.82, currentPrice: 1.30, purchaseDate: '2026-01-05', color: '#06b6d4', platform: 'Tiger Brokers',
    notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$1.05, current S$1.66/unit). Cost basis is the weighted average of every DCA order below.',
    purchaseHistory: [
      { date: '2024-02-14', price: 0.908, units: 2202.65, amount: 2000.00, currency: 'SGD' },
      { date: '2024-03-01', price: 0.940, units: 212.76, amount: 199.99, currency: 'SGD' },
      { date: '2024-03-31', price: 0.950, units: 210.52, amount: 199.99, currency: 'SGD' },
      { date: '2024-04-30', price: 0.917, units: 218.1, amount: 200.00, currency: 'SGD' },
      { date: '2024-06-01', price: 1.000, units: 200, amount: 200.00, currency: 'SGD' },
      { date: '2024-07-01', price: 1.108, units: 180.5, amount: 199.99, currency: 'SGD' },
      { date: '2024-08-01', price: 0.987, units: 202.63, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-01', price: 1.002, units: 199.6, amount: 200.00, currency: 'SGD' },
      { date: '2024-09-30', price: 1.028, units: 194.55, amount: 199.99, currency: 'SGD' },
      { date: '2024-11-01', price: 1.080, units: 185.18, amount: 199.99, currency: 'SGD' },
      { date: '2024-12-01', price: 1.1972, units: 167.05, amount: 200.00, currency: 'SGD' },
      { date: '2024-12-31', price: 1.2293, units: 162.69, amount: 199.99, currency: 'SGD' },
      { date: '2025-02-01', price: 1.1721, units: 170.6, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-03', price: 1.1024, units: 181.42, amount: 200.00, currency: 'SGD' },
      { date: '2025-03-31', price: 1.0415, units: 192.03, amount: 200.00, currency: 'SGD' },
      { date: '2025-05-02', price: 1.0366, units: 192.93, amount: 199.99, currency: 'SGD' },
      { date: '2025-05-31', price: 1.1127, units: 179.74, amount: 200.00, currency: 'SGD' },
      { date: '2025-07-01', price: 1.1981, units: 166.93, amount: 200.00, currency: 'SGD' },
      { date: '2025-07-31', price: 1.2311, units: 162.45, amount: 199.99, currency: 'SGD' },
      { date: '2025-08-30', price: 1.2498, units: 160.02, amount: 200.00, currency: 'SGD' },
      { date: '2025-09-30', price: 1.3711, units: 145.86, amount: 199.99, currency: 'SGD' },
      { date: '2025-10-31', price: 1.4752, units: 135.57, amount: 200.00, currency: 'SGD' },
      { date: '2025-11-28', price: 1.3953, units: 143.36, amount: 199.99, currency: 'SGD' },
      { date: '2026-01-01', price: 1.3861, units: 144.28, amount: 200.00, currency: 'SGD' },
      { date: '2026-01-31', price: 1.3623, units: 146.81, amount: 199.99, currency: 'SGD' },
    ],
  },
  { name: 'LionGlobal Singapore Trust (SGD)', type: 'mutual_fund', units: 199.58, buyPrice: 4.30, currentPrice: 5.24, purchaseDate: '2026-01-01', color: '#ec4899', platform: 'Tiger Brokers', notes: 'Tiger Brokers unit trust. Originally priced in SGD (cost S$5.51, current S$6.72/unit).', purchaseHistory: [{ date: '2026-01-01', price: 5.51, units: 199.58, amount: 1100.00, currency: 'SGD' }] },
  // Tiger Brokers - stocks
  { name: 'WinkingStudios', ticker: 'WKS.SI', type: 'stock', units: 200, buyPrice: 0.156, currentPrice: 0.1599, purchaseDate: '2023-12-03', color: '#84cc16', platform: 'Tiger Brokers', notes: 'Tiger Brokers stock. Filled buy order: 200 shares @ limit S$0.200 on 2023-12-03 (an earlier S$0.200 order that day was cancelled).', purchaseHistory: [{ date: '2023-12-03', price: 0.156, units: 200, amount: 31.20 }] },
  { name: 'Apple Inc.', ticker: 'AAPL', type: 'stock', units: 1.25364, buyPrice: 221.15, currentPrice: 298.43, purchaseDate: '2026-01-02', color: '#6366f1', platform: 'Tiger Brokers', notes: 'Tiger Brokers auto-invest: USD 2 every Thursday.', autoInvest: { amountUsd: 2, frequency: 'weekly', dayOfWeek: 4, lastAppliedDate: '2026-06-18' }, purchaseHistory: [{ date: '2026-01-02', price: 221.15, units: 1.25364, amount: 277.20 }] },
  { name: 'Marvell Technology', ticker: 'MRVL', type: 'stock', units: 0.10369, buyPrice: 241.05, currentPrice: 324.38, purchaseDate: '2026-05-20', color: '#ef4444', platform: 'Tiger Brokers', notes: 'Tiger Brokers auto-invest: USD 5 every Wednesday.', autoInvest: { amountUsd: 5, frequency: 'weekly', dayOfWeek: 3, lastAppliedDate: '2026-06-18' }, purchaseHistory: [{ date: '2026-05-20', price: 241.05, units: 0.10369, amount: 24.99 }] },
  { name: 'NVIDIA Corp', ticker: 'NVDA', type: 'stock', units: 3.03564, buyPrice: 121.58, currentPrice: 209.38, purchaseDate: '2026-01-02', color: '#10b981', platform: 'Tiger Brokers', notes: 'Tiger Brokers auto-invest: USD 5 every Thursday.', autoInvest: { amountUsd: 5, frequency: 'weekly', dayOfWeek: 4, lastAppliedDate: '2026-06-18' }, purchaseHistory: [{ date: '2026-01-02', price: 121.58, units: 3.03564, amount: 369.07 }] },
  { name: 'SpaceX', ticker: 'SPCX', type: 'stock', units: 2, buyPrice: 206.96, currentPrice: 179.88, purchaseDate: '2026-06-16', color: '#3b82f6', platform: 'Tiger Brokers', notes: 'Tiger Brokers stock. Average Filled Price was $205.87/share (Filled Amount $411.74); average cost above includes a $2.18 brokerage commission, matching Tiger\'s portfolio view.', purchaseHistory: [{ date: '2026-06-16', price: 205.87, units: 2, amount: 411.74, fee: 2.18 }] },
  // Coinbase - crypto
  { name: 'XRP', ticker: 'XRP', type: 'crypto', units: 265.02, buyPrice: 1.47, currentPrice: 1.21, purchaseDate: '2026-02-05', color: '#f59e0b', platform: 'Coinbase', notes: 'Bought via Coinbase for S$500. Price from Coinbase, updated 2026-06-18 — check Coinbase for the latest.', purchaseHistory: [{ date: '2026-02-05', price: 1.47, units: 265.02, amount: 389.58 }] },
];

const PLATFORM_ORDER: InvestmentPlatform[] = ['Tiger Brokers', 'Coinbase', 'StashAway', 'Other'];

// Platforms actually covered by REAL_HOLDINGS, in display order, for the Import modal's per-platform toggles.
const IMPORT_PLATFORMS = PLATFORM_ORDER.filter(p => REAL_HOLDINGS.some(h => h.platform === p));

const TYPE_LABELS: Record<InvestmentType, string> = {
  stock: 'Stock', etf: 'ETF', crypto: 'Crypto', mutual_fund: 'Mutual Fund',
  bond: 'Bond', real_estate: 'Real Estate', gold: 'Gold', other: 'Other',
};

const INV_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16',
];

// Maps common crypto ticker symbols to CoinGecko's coin IDs for live price lookups.
const CRYPTO_ID_MAP: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', XRP: 'ripple', SOL: 'solana',
  ADA: 'cardano', DOGE: 'dogecoin', BNB: 'binancecoin', LTC: 'litecoin',
  DOT: 'polkadot', MATIC: 'matic-network', AVAX: 'avalanche-2',
  LINK: 'chainlink', SHIB: 'shiba-inu', TRX: 'tron', ATOM: 'cosmos',
  UNI: 'uniswap', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
};

interface InvForm {
  name: string; type: InvestmentType; ticker: string;
  units: string; buyPrice: string; currentPrice: string; fee: string;
  purchaseDate: string; notes: string; color: string;
  platform: InvestmentPlatform;
}

const emptyForm: InvForm = {
  name: '', type: 'stock', ticker: '', units: '',
  buyPrice: '', currentPrice: '', fee: '', purchaseDate: '',
  notes: '', color: '#3b82f6', platform: 'Other',
};

// Briefly highlights green/red whenever `value` changes, to surface live price ticks.
function FlashValue({ value, format, className = '' }: { value: number; format: (v: number) => string; className?: string }) {
  const prevValue = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value !== prevValue.current) {
      setFlash(value > prevValue.current ? 'up' : 'down');
      prevValue.current = value;
      const timeout = setTimeout(() => setFlash(null), 1200);
      return () => clearTimeout(timeout);
    }
  }, [value]);

  return (
    <span
      className={`inline-block rounded px-1 transition-colors duration-700 ${
        flash === 'up' ? 'bg-emerald-500/25 text-emerald-300' : flash === 'down' ? 'bg-rose-500/25 text-rose-300' : ''
      } ${className}`}
    >
      {format(value)}
    </span>
  );
}

export default function Investments() {
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useFinanceStore();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<InvForm>(emptyForm);
  const [showImportModal, setShowImportModal] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [importPlatforms, setImportPlatforms] = useState<Set<InvestmentPlatform>>(
    () => new Set(IMPORT_PLATFORMS)
  );
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [stockSyncing, setStockSyncing] = useState(false);
  const [stockSyncError, setStockSyncError] = useState('');
  const [stockLastSynced, setStockLastSynced] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [syncTick, setSyncTick] = useState(0);
  const [stashAwayCurrency, setStashAwayCurrency] = useState<'USD' | 'SGD'>('USD');
  const [usdSgdRate, setUsdSgdRate] = useState<number | null>(null);

  // Fetch the live USD->SGD rate the first time the StashAway view is switched to SGD
  // (StashAway's own app reports balances in SGD; our stored data stays in USD either way).
  useEffect(() => {
    if (stashAwayCurrency !== 'SGD' || usdSgdRate !== null) return;
    fetch('/api/quote?symbols=USDSGD=X')
      .then(res => res.json())
      .then(data => {
        const rate = data['USDSGD=X'];
        if (typeof rate === 'number') setUsdSgdRate(rate);
      })
      .catch(() => {});
  }, [stashAwayCurrency, usdSgdRate]);

  function formatStashAway(usdAmount: number): string {
    if (stashAwayCurrency === 'SGD' && usdSgdRate) return formatCurrency(usdAmount * usdSgdRate, 'S$');
    return formatCurrency(usdAmount);
  }

  // Auto-refresh live prices on page load, then every 15 minutes while this page stays open —
  // no need to click "Sync" manually. (Only runs while a tab has this page open; it can't
  // update prices in the background once the browser is closed.)
  useEffect(() => {
    const id = setInterval(() => setSyncTick(t => t + 1), 15 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    handleSyncStocks();
    handleSyncCrypto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncTick]);

  useEffect(() => {
    async function syncAutoInvest() {
      const dueList = investments.filter(inv => inv.autoInvest);
      if (dueList.length === 0) return;

      // Fetch today's live price for these tickers so auto-invest contributions
      // (and the displayed P&L) use real market prices, not a stale stored value.
      const tickers = Array.from(new Set(dueList.map(inv => inv.ticker).filter(Boolean))) as string[];
      let livePrices: Record<string, number> = {};
      if (tickers.length > 0) {
        try {
          const res = await fetch(`/api/quote?symbols=${tickers.map(encodeURIComponent).join(',')}`);
          if (res.ok) livePrices = await res.json();
        } catch {
          // fall back to each holding's stored currentPrice if the price service is unreachable
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueList.forEach(inv => {
        const cfg = inv.autoInvest!;
        const price = (inv.ticker && livePrices[inv.ticker]) || inv.currentPrice;
        let units = inv.units;
        let buyPrice = inv.buyPrice;
        let lastApplied = cfg.lastAppliedDate;
        let changed = price !== inv.currentPrice;
        const newRecords: PurchaseRecord[] = [];
        let next = nextAutoInvestOccurrence(new Date(cfg.lastAppliedDate), cfg);
        while (next <= today) {
          const addedUnits = cfg.amountUsd / price;
          const newUnits = units + addedUnits;
          buyPrice = (units * buyPrice + addedUnits * price) / newUnits;
          units = newUnits;
          lastApplied = next.toISOString().slice(0, 10);
          newRecords.push({ date: lastApplied, price, units: addedUnits, amount: cfg.amountUsd });
          changed = true;
          next = nextAutoInvestOccurrence(next, cfg);
        }
        if (changed) {
          updateInvestment(inv.id, {
            units, buyPrice, currentPrice: price,
            autoInvest: { ...cfg, lastAppliedDate: lastApplied },
            purchaseHistory: [...(inv.purchaseHistory || []), ...newRecords],
          });
        }
      });
    }
    syncAutoInvest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalValue = getTotalInvestmentValue(investments);
  const totalCost = getTotalInvestmentCost(investments);
  const totalReturn = totalValue - totalCost;
  const returnPct = getInvestmentReturn(investments);

  const allocationData = investments.map(inv => ({
    name: inv.ticker || inv.name,
    value: inv.units * inv.currentPrice,
    color: inv.color,
  }));

  const performanceData = investments.map(inv => ({
    name: inv.ticker || inv.name.substring(0, 8),
    cost: inv.units * inv.buyPrice,
    value: inv.units * inv.currentPrice,
    gain: inv.units * inv.currentPrice - inv.units * inv.buyPrice,
  }));

  const platformGroups = PLATFORM_ORDER.map(platform => {
    const holdings = investments.filter(inv => (inv.platform || 'Other') === platform);
    const value = holdings.reduce((sum, inv) => sum + inv.units * inv.currentPrice, 0);
    const cost = holdings.reduce((sum, inv) => sum + inv.units * inv.buyPrice, 0);
    return { platform, holdings, value, cost, gain: value - cost };
  }).filter(g => g.holdings.length > 0);

  const detailInv = investments.find(inv => inv.id === detailId) || null;

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setShowModal(true);
  }

  function openEdit(inv: Investment) {
    // If this holding has a single purchase on record, split its buyPrice back into the
    // raw fill price + fee so re-editing doesn't double-count a fee already folded in.
    const singleRecord = inv.purchaseHistory?.length === 1 ? inv.purchaseHistory[0] : null;
    setForm({
      name: inv.name, type: inv.type, ticker: inv.ticker || '',
      units: String(inv.units), buyPrice: String(singleRecord ? singleRecord.price : inv.buyPrice),
      currentPrice: String(inv.currentPrice), fee: singleRecord?.fee ? String(singleRecord.fee) : '',
      purchaseDate: inv.purchaseDate,
      notes: inv.notes || '', color: inv.color, platform: inv.platform || 'Other',
    });
    setEditId(inv.id);
    setShowModal(true);
  }

  function handleSubmit() {
    if (!form.name || !form.units || !form.buyPrice || !form.currentPrice) return;
    const units = parseFloat(form.units);
    const rawPrice = parseFloat(form.buyPrice);
    const fee = parseFloat(form.fee) || 0;
    const buyPrice = fee > 0 && units > 0 ? rawPrice + fee / units : rawPrice;
    const existing = editId ? investments.find(inv => inv.id === editId) : null;
    const payload: Omit<Investment, 'id'> = {
      name: form.name, type: form.type, ticker: form.ticker || undefined,
      units, buyPrice,
      currentPrice: parseFloat(form.currentPrice), purchaseDate: form.purchaseDate,
      notes: form.notes || undefined, color: form.color, platform: form.platform,
    };
    // Keep a single-entry purchase history in sync with the raw price/fee so editing again later splits correctly.
    if (!existing || !existing.purchaseHistory || existing.purchaseHistory.length <= 1) {
      payload.purchaseHistory = [{
        date: form.purchaseDate, price: rawPrice, units, amount: rawPrice * units,
        fee: fee > 0 ? fee : undefined,
      }];
    }
    if (editId) {
      updateInvestment(editId, payload);
    } else {
      addInvestment(payload);
    }
    setShowModal(false);
  }

  async function handleSyncCrypto() {
    const cryptoHoldings = investments.filter(inv => inv.type === 'crypto' && inv.ticker && CRYPTO_ID_MAP[inv.ticker.toUpperCase()]);
    if (cryptoHoldings.length === 0) {
      setSyncError('No crypto holdings with a recognized ticker (e.g. BTC, ETH, XRP) to sync.');
      return;
    }
    setSyncing(true);
    setSyncError('');
    try {
      const ids = Array.from(new Set(cryptoHoldings.map(h => CRYPTO_ID_MAP[h.ticker!.toUpperCase()])));
      const res = await fetch(`/api/crypto-quote?ids=${ids.map(encodeURIComponent).join(',')}`);
      if (!res.ok) throw new Error('Price service unavailable, try again later.');
      const data = await res.json();
      const unresolved: string[] = [];
      cryptoHoldings.forEach(h => {
        const price = data[CRYPTO_ID_MAP[h.ticker!.toUpperCase()]]?.usd;
        if (typeof price === 'number') updateInvestment(h.id, { currentPrice: price });
        else unresolved.push(h.ticker!);
      });
      setLastSynced(new Date().toLocaleTimeString());
      setSyncError(unresolved.length > 0 ? `Couldn't get a live price for: ${unresolved.join(', ')}.` : '');
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Failed to sync prices. (Live crypto sync only works on the deployed Vercel site, not local dev.)');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncStocks() {
    const stockHoldings = investments.filter(inv => (inv.type === 'stock' || inv.type === 'etf') && inv.ticker);
    if (stockHoldings.length === 0) {
      setStockSyncError('No stock or ETF holdings with a ticker to sync.');
      return;
    }
    setStockSyncing(true);
    setStockSyncError('');
    try {
      const tickers = Array.from(new Set(stockHoldings.map(h => h.ticker!)));
      const res = await fetch(`/api/quote?symbols=${tickers.map(encodeURIComponent).join(',')}`);
      if (!res.ok) throw new Error('Price service unavailable, try again later.');
      const data = await res.json();
      const unresolved: string[] = [];
      stockHoldings.forEach(h => {
        const price = data[h.ticker!];
        if (typeof price === 'number') updateInvestment(h.id, { currentPrice: price });
        else unresolved.push(h.ticker!);
      });
      setStockLastSynced(new Date().toLocaleTimeString());
      setStockSyncError(unresolved.length > 0 ? `Couldn't get a live price for: ${unresolved.join(', ')}.` : '');
    } catch (err) {
      setStockSyncError(err instanceof Error ? err.message : 'Failed to sync prices. (Live stock sync only works on the deployed Vercel site, not local dev.)');
    } finally {
      setStockSyncing(false);
    }
  }

  function handleImport() {
    if (replaceExisting) {
      investments.filter(inv => importPlatforms.has(inv.platform ?? 'Other')).forEach(inv => deleteInvestment(inv.id));
    }
    REAL_HOLDINGS.filter(h => importPlatforms.has(h.platform ?? 'Other')).forEach(h => addInvestment(h));
    setShowImportModal(false);
  }

  function toggleImportPlatform(platform: InvestmentPlatform) {
    setImportPlatforms(prev => {
      const next = new Set(prev);
      if (next.has(platform)) next.delete(platform);
      else next.add(platform);
      return next;
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Investment Portfolio</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track your wealth growth · prices auto-refresh every 15 min while this page is open</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSyncStocks} disabled={stockSyncing} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={stockSyncing ? 'animate-spin' : ''} /> {stockSyncing ? 'Syncing...' : 'Sync Stock Prices Now'}
          </button>
          <button onClick={handleSyncCrypto} disabled={syncing} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Syncing...' : 'Sync Crypto Prices Now'}
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Import My Holdings
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Investment
          </button>
        </div>
      </div>
      {(syncError || lastSynced || stockSyncError || stockLastSynced) && (
        <div className="space-y-0.5">
          {(syncError || lastSynced) && (
            <p className={`text-xs ${syncError ? 'text-rose-400' : 'text-slate-500'}`}>
              {syncError || `Crypto prices synced at ${lastSynced}`}
            </p>
          )}
          {(stockSyncError || stockLastSynced) && (
            <p className={`text-xs ${stockSyncError ? 'text-rose-400' : 'text-slate-500'}`}>
              {stockSyncError || `Stock/ETF prices synced at ${stockLastSynced}`}
            </p>
          )}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Portfolio Value</div>
          <div className="text-2xl font-bold text-white"><FlashValue value={totalValue} format={formatCurrency} /></div>
          <div className="text-xs text-slate-500 mt-0.5">current market value</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Invested</div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalCost)}</div>
          <div className="text-xs text-slate-500 mt-0.5">cost basis</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Total Return</div>
          <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <FlashValue value={totalReturn} format={v => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`} />
          </div>
          <div className="text-xs text-slate-500 mt-0.5">unrealized P&L</div>
        </div>
        <div className="card">
          <div className="text-xs text-slate-400 mb-1">Return %</div>
          <div className={`text-2xl font-bold flex items-center gap-1.5 ${returnPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {returnPct >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            {returnPct >= 0 ? '+' : ''}{formatPercent(returnPct)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">portfolio return</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Portfolio Allocation</h2>
          <div className="flex gap-4 items-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={allocationData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {allocationData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatCurrency(v), '']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {allocationData.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-slate-400">{d.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-200 font-medium">{formatCurrency(d.value)}</div>
                    <div className="text-slate-500">{totalValue > 0 ? ((d.value / totalValue) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-white mb-4">Cost vs Current Value</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={performanceData} barGap={4}>
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}k`} />
              <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n === 'cost' ? 'Cost' : 'Value']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
              <Bar dataKey="cost" name="Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="value" name="Value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Holdings by Platform */}
      {platformGroups.map(group => {
        const isStashAway = group.platform === 'StashAway';
        const fmt = isStashAway ? formatStashAway : formatCurrency;
        return (
        <div key={group.platform} className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-white">{group.platform}</h2>
              {isStashAway && (
                <div className="flex rounded-lg bg-slate-800 p-0.5 text-xs">
                  {(['USD', 'SGD'] as const).map(cur => (
                    <button
                      key={cur}
                      onClick={() => setStashAwayCurrency(cur)}
                      className={`px-2 py-0.5 rounded-md transition-colors ${stashAwayCurrency === cur ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-slate-500"><FlashValue value={group.value} format={fmt} /> value</span>
              <span className={`font-medium ${group.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <FlashValue value={group.gain} format={v => `${v >= 0 ? '+' : ''}${fmt(v)}`} />
              </span>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs text-slate-500 font-medium px-5 py-3">Asset</th>
                <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Type</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Units</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Buy Price</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Current</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Value</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Return</th>
                <th className="text-right text-xs text-slate-500 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {group.holdings.map(inv => {
                const value = inv.units * inv.currentPrice;
                const cost = inv.units * inv.buyPrice;
                const gain = value - cost;
                const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
                return (
                  <tr key={inv.id} onClick={() => setDetailId(inv.id)} className="hover:bg-slate-800/30 transition-colors cursor-pointer">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: inv.color + '20', color: inv.color }}>
                          {(inv.ticker || inv.name).charAt(0)}
                        </div>
                        <div>
                          <div className="text-white font-medium text-xs flex items-center gap-1.5">
                            {inv.name}
                            {inv.autoInvest && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Auto</span>
                            )}
                          </div>
                          {inv.ticker && <div className="text-slate-500 text-xs">{inv.ticker}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{TYPE_LABELS[inv.type]}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs">{inv.units}</td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs">{fmt(inv.buyPrice)}</td>
                    <td className="px-4 py-3 text-right text-slate-300 text-xs"><FlashValue value={inv.currentPrice} format={fmt} /></td>
                    <td className="px-4 py-3 text-right text-white font-medium text-xs"><FlashValue value={value} format={fmt} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className={`text-xs font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        <FlashValue value={gain} format={v => `${v >= 0 ? '+' : ''}${fmt(v)}`} />
                      </div>
                      <div className={`text-xs ${gainPct >= 0 ? 'text-emerald-400/70' : 'text-rose-400/70'}`}>
                        <FlashValue value={gainPct} format={v => `${v >= 0 ? '+' : ''}${formatPercent(v)}`} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); openEdit(inv); }} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteInvestment(inv.id); }} className="p-1.5 rounded-lg hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        );
      })}

      {/* Detail Modal */}
      {detailInv && (() => {
        const value = detailInv.units * detailInv.currentPrice;
        const cost = detailInv.units * detailInv.buyPrice;
        const gain = value - cost;
        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
        const history = [...(detailInv.purchaseHistory || [])].sort((a, b) => a.date.localeCompare(b.date));
        const chartData = history.map(r => ({ date: formatDate(r.date), price: r.price }));
        const fmtPrice = (r: PurchaseRecord) => r.currency === 'SGD' ? `S$${r.price.toFixed(4)}` : formatCurrency(r.price);
        const fmtAmount = (r: PurchaseRecord) => r.currency === 'SGD' ? `S$${r.amount.toFixed(2)}` : formatCurrency(r.amount);
        const fmtFee = (r: PurchaseRecord) => r.currency === 'SGD' ? `S$${(r.fee || 0).toFixed(2)}` : formatCurrency(r.fee || 0);
        const hasFees = history.some(r => r.fee);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setDetailId(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: detailInv.color + '20', color: detailInv.color }}>
                    {(detailInv.ticker || detailInv.name).charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      {detailInv.name}
                      {detailInv.autoInvest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Auto</span>
                      )}
                    </h2>
                    <div className="text-xs text-slate-500">
                      {detailInv.ticker && <span>{detailInv.ticker} · </span>}
                      {TYPE_LABELS[detailInv.type]} · {detailInv.platform || 'Other'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setDetailId(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Units</div>
                  <div className="text-sm font-semibold text-white">{detailInv.units}</div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Avg Buy Price</div>
                  <div className="text-sm font-semibold text-white">{formatCurrency(detailInv.buyPrice)}</div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Current Price</div>
                  <div className="text-sm font-semibold text-white"><FlashValue value={detailInv.currentPrice} format={formatCurrency} /></div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Value</div>
                  <div className="text-sm font-semibold text-white"><FlashValue value={value} format={formatCurrency} /></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Cost Basis</div>
                  <div className="text-sm font-semibold text-white">{formatCurrency(cost)}</div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Return</div>
                  <div className={`text-sm font-semibold ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <FlashValue value={gain} format={v => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`} />
                  </div>
                </div>
                <div className="card py-3">
                  <div className="text-xs text-slate-400 mb-1">Return %</div>
                  <div className={`text-sm font-semibold ${gainPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <FlashValue value={gainPct} format={v => `${v >= 0 ? '+' : ''}${formatPercent(v)}`} />
                  </div>
                </div>
              </div>

              {chartData.length > 1 ? (
                <div className="card mb-5">
                  <h3 className="text-sm font-semibold text-white mb-3">Purchase Price Over Time</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData}>
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                      <Tooltip formatter={(v: number) => [formatCurrency(v), 'Price']} contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }} />
                      <Line type="monotone" dataKey="price" stroke={detailInv.color} strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mb-5">Single lump purchase — no price history to chart yet.</p>
              )}

              <h3 className="text-sm font-semibold text-white mb-2">Purchase History</h3>
              <div className="rounded-xl border border-slate-800 overflow-hidden mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-800/40">
                      <th className="text-left text-slate-500 font-medium px-3 py-2">Date</th>
                      <th className="text-right text-slate-500 font-medium px-3 py-2">Price</th>
                      <th className="text-right text-slate-500 font-medium px-3 py-2">Units</th>
                      <th className="text-right text-slate-500 font-medium px-3 py-2">Amount</th>
                      {hasFees && <th className="text-right text-slate-500 font-medium px-3 py-2">Fee</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {history.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 text-slate-300">{formatDate(r.date)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{fmtPrice(r)}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{r.units}</td>
                        <td className="px-3 py-2 text-right text-slate-300">{fmtAmount(r)}</td>
                        {hasFees && <td className="px-3 py-2 text-right text-slate-400">{r.fee ? fmtFee(r) : '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detailInv.notes && (
                <p className="text-xs text-slate-500">{detailInv.notes}</p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Import My Holdings</h2>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Choose which platform(s) to import. Only the holdings for the checked platform(s) will be added (and removed first, if selected below).
            </p>
            <div className="space-y-2 mb-4">
              {IMPORT_PLATFORMS.map(platform => {
                const count = REAL_HOLDINGS.filter(h => h.platform === platform).length;
                return (
                  <label key={platform} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importPlatforms.has(platform)}
                      onChange={() => toggleImportPlatform(platform)}
                      className="w-4 h-4"
                    />
                    {platform} <span className="text-slate-500">({count} holding{count === 1 ? '' : 's'})</span>
                  </label>
                );
              })}
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 mb-5 cursor-pointer">
              <input type="checkbox" checked={replaceExisting} onChange={e => setReplaceExisting(e.target.checked)} className="w-4 h-4" />
              Remove existing investment(s) for the checked platform(s) first
              ({investments.filter(inv => importPlatforms.has(inv.platform ?? 'Other')).length})
            </label>
            <div className="flex gap-3">
              <button onClick={() => setShowImportModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleImport}
                disabled={importPlatforms.size === 0}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={15} /> Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg mx-4 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'Add'} Investment</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Asset Name *</label>
                  <input className="input" placeholder="e.g. Apple Inc." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Ticker Symbol</label>
                  <input className="input" placeholder="e.g. AAPL" value={form.ticker} onChange={e => setForm(f => ({ ...f, ticker: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Asset Type</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as InvestmentType }))}>
                    {(Object.entries(TYPE_LABELS)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Purchase Date</label>
                  <input className="input" type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Platform</label>
                <select className="input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value as InvestmentPlatform }))}>
                  {PLATFORM_ORDER.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Units / Shares *</label>
                  <input className="input" type="number" min="0" step="any" placeholder="0" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Buy Price *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.buyPrice} onChange={e => setForm(f => ({ ...f, buyPrice: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Current Price *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="label">Fees / Charges (total, optional)</label>
                <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 2.18 brokerage commission" value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} />
                <p className="text-xs text-slate-500 mt-1">Total commission charged on top of Buy Price × Units — added to your average cost, like Tiger Brokers' portfolio view.</p>
              </div>
              <div>
                <label className="label">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {INV_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input resize-none" rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  <Check size={15} /> {editId ? 'Update' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
