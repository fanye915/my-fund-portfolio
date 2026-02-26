class FundCalculator {
    // 计算单个持仓的详细信息
    calculateHoldingDetails(holding, fundConfig) {
        const totalAmount = fundConfig.totalAmount;
        const allocationAmount = totalAmount * holding.allocation;
        
        // 如果还没有买入价格，使用当前价格作为初始价格
        if (!holding.purchasePrice && holding.currentPrice) {
            holding.purchasePrice = holding.currentPrice;
        }
        
        const currentValue = holding.currentPrice ? 
            (allocationAmount / holding.purchasePrice) * holding.currentPrice : 
            allocationAmount;
        
        const profit = currentValue - allocationAmount;
        const profitRate = (profit / allocationAmount) * 100;
        
        return {
            code: holding.code,
            name: holding.name,
            allocation: (holding.allocation * 100).toFixed(1) + '%',
            allocationAmount: allocationAmount,
            purchasePrice: holding.purchasePrice,
            currentPrice: holding.currentPrice,
            currentValue: currentValue,
            profit: profit,
            profitRate: profitRate,
            shares: holding.purchasePrice ? (allocationAmount / holding.purchasePrice) : 0
        };
    }

    // 计算整个基金的汇总信息
    calculateFundSummary(fundData, fundConfig) {
        let totalCurrentValue = 0;
        let totalProfit = 0;
        let totalAllocationAmount = 0;
        
        const holdings = fundData.map(holding => {
            const details = this.calculateHoldingDetails(holding, fundConfig);
            totalCurrentValue += details.currentValue;
            totalProfit += details.profit;
            totalAllocationAmount += details.allocationAmount;
            return details;
        });
        
        const totalProfitRate = (totalProfit / totalAllocationAmount) * 100;
        
        return {
            holdings: holdings,
            summary: {
                totalAmount: fundConfig.totalAmount,
                totalCurrentValue: totalCurrentValue,
                totalProfit: totalProfit,
                totalProfitRate: totalProfitRate,
                currency: fundConfig.currency
            }
        };
    }

    // 计算所有基金的总资产（转换为人民币）
    calculateTotalAssets(allFundsData) {
        let totalCNY = 0;
        
        Object.keys(allFundsData).forEach(fundType => {
            const fundConfig = FUNDS_CONFIG[fundType];
            const fundData = allFundsData[fundType];
            const fundSummary = this.calculateFundSummary(fundData, fundConfig);
            
            // 转换为人民币
            const exchangeRate = EXCHANGE_RATES[fundConfig.currency];
            totalCNY += fundSummary.summary.totalCurrentValue * exchangeRate;
        });
        
        return totalCNY;
    }
}
