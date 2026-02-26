// 股票代码映射
const stockCodes = {
    'A股': ['513390', '159652', '588200', '515880', '518880'],
    '港股': ['03455', '03132', '03147', '03110', '02840'],
    '美股': ['QQQ', 'SPY', 'RING', 'COPX', 'BITB']
};

// 持仓权重
const weights = {
    'A股': [0.25, 0.25, 0.25, 0.15, 0.10],
    '港股': [0.25, 0.20, 0.20, 0.20, 0.15],
    '美股': [0.25, 0.25, 0.20, 0.20, 0.10]
};

// 初始投资金额
const initialInvestment = 1000000;

// 存储股票数据
let stockData = {};

// 获取新浪数据的函数
async function getSinaData(symbols) {
    const sinaUrl = `http://hq.sinajs.cn/list=${symbols.join(',')}`;
    try {
        const response = await fetch(sinaUrl);
        const text = await response.text();
        return parseSinaData(text, symbols);
    } catch (error) {
        console.error('获取数据失败:', error);
        return {};
    }
}

// 解析新浪数据
function parseSinaData(data, symbols) {
    const lines = data.split('\n');
    const results = {};
    
    lines.forEach((line, index) => {
        if (!line.trim()) return;
        
        const match = line.match(/var hq_str_(.+)="(.*)";/);
        if (match) {
            const symbol = match[1];
            const fields = match[2].split(',');
            
            if (fields.length >= 3) {
                // 对于A股和港股，价格通常是第3个字段
                // 对于美股，价格通常是第1个字段（开盘价）
                let currentPrice = 0;
                let yesterdayPrice = 0;
                
                if (symbol.includes('sh') || symbol.includes('sz')) {
                    // A股
                    currentPrice = parseFloat(fields[3]) || 0;
                    yesterdayPrice = parseFloat(fields[2]) || 0; // 昨收价
                } else if (symbol.includes('hk')) {
                    // 港股
                    currentPrice = parseFloat(fields[6]) || 0; // 现价
                    yesterdayPrice = parseFloat(fields[3]) || 0; // 昨收价
                } else {
                    // 美股
                    currentPrice = parseFloat(fields[1]) || 0; // 开盘价作为当前价
                    yesterdayPrice = parseFloat(fields[2]) || 0; // 昨收价
                }
                
                results[symbol] = {
                    currentPrice: currentPrice,
                    yesterdayPrice: yesterdayPrice,
                    change: currentPrice && yesterdayPrice ? ((currentPrice - yesterdayPrice) / yesterdayPrice * 100).toFixed(2) : '0.00'
                };
            }
        }
    });
    
    return results;
}

// 计算组合数据
function calculatePortfolio(portfolioType) {
    const symbols = stockCodes[portfolioType];
    const weightsArray = weights[portfolioType];
    
    let totalValue = 0;
    let totalInitialValue = 0;
    
    symbols.forEach((symbol, index) => {
        const weight = weightsArray[index];
        const initialAmount = initialInvestment * weight;
        
        if (stockData[symbol]) {
            const currentPrice = stockData[symbol].currentPrice;
            const yesterdayPrice = stockData[symbol].yesterdayPrice;
            
            if (currentPrice > 0 && yesterdayPrice > 0) {
                // 计算当前价值
                const shares = initialAmount / yesterdayPrice; // 基于设立日价格计算份额
                const currentValue = shares * currentPrice;
                
                totalValue += currentValue;
                totalInitialValue += initialAmount;
            }
        }
    });
    
    const profit = totalValue - totalInitialValue;
    const returnRate = totalInitialValue ? ((profit / totalInitialValue) * 100).toFixed(2) : '0.00';
    
    return {
        netValue: totalValue.toFixed(2),
        profit: profit.toFixed(2),
        returnRate: returnRate
    };
}

// 更新页面显示
function updateDisplay() {
    // 更新A股数据
    const aGuData = calculatePortfolio('A股');
    document.getElementById('a-gu-net-value').textContent = formatNumber(aGuData.netValue);
    document.getElementById('a-gu-profit').textContent = formatNumber(aGuData.profit);
    document.getElementById('a-gu-return').textContent = `${aGuData.returnRate}%`;
    
    // 更新港股数据
    const hkGuData = calculatePortfolio('港股');
    document.getElementById('hk-gu-net-value').textContent = formatNumber(hkGuData.netValue);
    document.getElementById('hk-gu-profit').textContent = formatNumber(hkGuData.profit);
    document.getElementById('hk-gu-return').textContent = `${hkGuData.returnRate}%`;
    
    // 更新美股数据
    const usGuData = calculatePortfolio('美股');
    document.getElementById('us-gu-net-value').textContent = formatNumber(usGuData.netValue);
    document.getElementById('us-gu-profit').textContent = formatNumber(usGuData.profit);
    document.getElementById('us-gu-return').textContent = `${usGuData.returnRate}%`;
    
    // 更新颜色
    updateColorClass('a-gu-profit', parseFloat(aGuData.profit));
    updateColorClass('a-gu-return', parseFloat(aGuData.returnRate));
    updateColorClass('hk-gu-profit', parseFloat(hkGuData.profit));
    updateColorClass('hk-gu-return', parseFloat(hkGuData.returnRate));
    updateColorClass('us-gu-profit', parseFloat(usGuData.profit));
    updateColorClass('us-gu-return', parseFloat(usGuData.returnRate));
}

// 格式化数字显示
function formatNumber(num) {
    return parseFloat(num).toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// 更新颜色类
function updateColorClass(elementId, value) {
    const element = document.getElementById(elementId);
    element.className = '';
    if (value > 0) {
        element.classList.add('positive');
    } else if (value < 0) {
        element.classList.add('negative');
    }
}

// 获取所有股票数据
async function fetchAllData() {
    // 合并所有股票代码
    const allSymbols = [...stockCodes['A股'], ...stockCodes['港股'], ...stockCodes['美股']];
    
    // 添加市场前缀
    const formattedSymbols = allSymbols.map(symbol => {
        if (symbol.endsWith('SH') || symbol.endsWith('SZ')) {
            return symbol.toLowerCase();
        } else if (symbol.startsWith('0')) {
            return `hk${symbol}`;
        } else if (symbol.length <= 4) {
            return `gb_${symbol.toLowerCase()}`; // 美股前缀
        } else {
            // A股代码
            if (symbol.startsWith('6')) return `sh${symbol}`;
            if (symbol.startsWith('0') || symbol.startsWith('3')) return `sz${symbol}`;
            return symbol;
        }
    });
    
    stockData = await getSinaData(formattedSymbols);
    updateDisplay();
}

// 初始化页面
document.addEventListener('DOMContentLoaded', function() {
    fetchAllData();
    
    // 每分钟更新一次数据
    setInterval(fetchAllData, 60000);
});

// 模拟图表绘制函数（简化版）
function drawChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            datasets: [{
                label: '净值曲线',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// 页面加载后绘制示例图表
window.addEventListener('load', function() {
    // 模拟一些数据
    const mockData = [1000000, 1020000, 1050000, 1030000, 1070000, 1090000, 1080000, 1100000, 1120000, 1150000, 1130000, 1170000];
    drawChart('a-gu-chart', mockData);
    drawChart('hk-gu-chart', mockData.map(v => v * 0.95)); // 港股模拟数据
    drawChart('us-gu-chart', mockData.map(v => v * 1.05)); // 美股模拟数据
});
