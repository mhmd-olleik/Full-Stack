/**
 * AIOK Trading — Chart Module (REAL DATA ONLY)
 * NO fake data. Chart is empty until real MT5 data arrives.
 */

const ChartModule = (() => {
    let chart = null;
    let candleSeries = null;
    let volumeSeries = null;
    let ema50Line = null;
    let ema200Line = null;
    let bbUpperLine = null;
    let bbLowerLine = null;
    let bbMiddleLine = null;
    let slLine = null;
    let tpLine = null;
    let showIndicators = true;
    let chartType = 'candle';
    let hasData = false;

    // Calculate EMA from real data
    function calculateEMA(data, period) {
        const ema = [];
        const multiplier = 2 / (period + 1);
        
        if (data.length < period) return ema;
        
        let sum = 0;
        for (let i = 0; i < period; i++) {
            sum += data[i].close;
        }
        let prevEma = sum / period;
        
        ema.push({ time: data[period - 1].time, value: parseFloat(prevEma.toFixed(2)) });
        
        for (let i = period; i < data.length; i++) {
            const currentEma = (data[i].close - prevEma) * multiplier + prevEma;
            ema.push({ time: data[i].time, value: parseFloat(currentEma.toFixed(2)) });
            prevEma = currentEma;
        }
        
        return ema;
    }

    // Calculate Bollinger Bands from real data
    function calculateBB(data, period = 20, stdDev = 2) {
        const upper = [];
        const middle = [];
        const lower = [];
        
        for (let i = period - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sum += data[j].close;
            }
            const sma = sum / period;
            
            let sqSum = 0;
            for (let j = i - period + 1; j <= i; j++) {
                sqSum += Math.pow(data[j].close - sma, 2);
            }
            const std = Math.sqrt(sqSum / period);
            
            const time = data[i].time;
            upper.push({ time, value: parseFloat((sma + stdDev * std).toFixed(2)) });
            middle.push({ time, value: parseFloat(sma.toFixed(2)) });
            lower.push({ time, value: parseFloat((sma - stdDev * std).toFixed(2)) });
        }
        
        return { upper, middle, lower };
    }

    /**
     * Initialize the chart — EMPTY, waiting for real data
     */
    function init(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Check if LightweightCharts is available
        if (typeof LightweightCharts === 'undefined') {
            container.innerHTML = `
                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#4b5563;font-size:0.85rem;gap:8px;">
                    <span>📊 Chart library loading...</span>
                </div>
            `;
            return;
        }

        chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight || 370,
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#9ca3af',
                fontSize: 11,
                fontFamily: "'Inter', sans-serif",
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            crosshair: {
                mode: 0,
                vertLine: {
                    color: 'rgba(251, 191, 36, 0.3)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#d97706',
                },
                horzLine: {
                    color: 'rgba(251, 191, 36, 0.3)',
                    width: 1,
                    style: 2,
                    labelBackgroundColor: '#d97706',
                },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.06)',
                scaleMargins: { top: 0.1, bottom: 0.2 },
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.06)',
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: { vertTouchDrag: false },
        });

        // Candlestick series
        candleSeries = chart.addCandlestickSeries({
            upColor: '#00e676',
            downColor: '#ff1744',
            borderUpColor: '#00e676',
            borderDownColor: '#ff1744',
            wickUpColor: '#00e67688',
            wickDownColor: '#ff174488',
        });

        // Volume series
        volumeSeries = chart.addHistogramSeries({
            priceFormat: { type: 'volume' },
            priceScaleId: 'volume',
            scaleMargins: { top: 0.85, bottom: 0 },
        });

        // EMA lines
        ema50Line = chart.addLineSeries({
            color: '#3b82f6',
            lineWidth: 1,
            lineStyle: 0,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            title: 'EMA 50',
        });

        ema200Line = chart.addLineSeries({
            color: '#f97316',
            lineWidth: 1,
            lineStyle: 0,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            title: 'EMA 200',
        });

        // Bollinger Bands
        bbUpperLine = chart.addLineSeries({
            color: 'rgba(251, 191, 36, 0.25)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });

        bbMiddleLine = chart.addLineSeries({
            color: 'rgba(251, 191, 36, 0.15)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });

        bbLowerLine = chart.addLineSeries({
            color: 'rgba(251, 191, 36, 0.25)',
            lineWidth: 1,
            lineStyle: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
        });

        // NO FAKE DATA — chart stays empty until real data arrives
        // Show waiting overlay
        const overlay = document.createElement('div');
        overlay.id = 'chart-waiting-overlay';
        overlay.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4b5563;font-size:0.85rem;gap:8px;z-index:5;pointer-events:none;';
        overlay.innerHTML = `
            <div style="font-size:2rem;">📊</div>
            <div style="font-weight:600;letter-spacing:1px;">WAITING FOR MT5 DATA</div>
            <div style="font-size:0.7rem;color:#374151;">Start backend: cd backend → python server.py</div>
        `;
        container.style.position = 'relative';
        container.appendChild(overlay);

        // Handle resize
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                chart.applyOptions({ width, height });
            }
        });
        resizeObserver.observe(container);
    }

    /**
     * Update with REAL candle data from MT5
     */
    function updateCandles(candles) {
        if (!candleSeries || !candles || candles.length === 0) return;
        
        // Remove waiting overlay when real data arrives
        if (!hasData) {
            const overlay = document.getElementById('chart-waiting-overlay');
            if (overlay) overlay.remove();
            hasData = true;
        }

        // Set real candle data
        candleSeries.setData(candles);

        // Build volume data from candles
        const volumeData = candles.map(c => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 23, 68, 0.3)'
        }));
        volumeSeries.setData(volumeData);

        // Calculate and display indicators on real data
        if (showIndicators) {
            const ema50Data = calculateEMA(candles, 50);
            const ema200Data = calculateEMA(candles, 200);
            const bb = calculateBB(candles, 20, 2);
            
            if (ema50Data.length > 0) ema50Line.setData(ema50Data);
            if (ema200Data.length > 0) ema200Line.setData(ema200Data);
            if (bb.upper.length > 0) {
                bbUpperLine.setData(bb.upper);
                bbMiddleLine.setData(bb.middle);
                bbLowerLine.setData(bb.lower);
            }
        }

        // Fit content
        chart.timeScale().fitContent();
    }

    /**
     * Add a single new candle (real-time update)
     */
    function updateLastCandle(candle) {
        if (!candleSeries || !candle) return;
        candleSeries.update(candle);
    }

    /**
     * Add trade markers on chart
     */
    function addTradeMarker(time, type, price) {
        if (!candleSeries) return;

        const markers = [{
            time: time,
            position: type === 'buy' ? 'belowBar' : 'aboveBar',
            color: type === 'buy' ? '#00e676' : '#ff1744',
            shape: type === 'buy' ? 'arrowUp' : 'arrowDown',
            text: type === 'buy' ? 'BUY' : 'SELL',
        }];

        candleSeries.setMarkers(markers);
    }

    /**
     * Draw SL/TP lines
     */
    function drawSLTP(sl, tp) {
        if (!chart) return;
        
        if (slLine) chart.removeSeries(slLine);
        if (tpLine) chart.removeSeries(tpLine);

        if (sl) {
            slLine = chart.addLineSeries({
                color: '#ff1744',
                lineWidth: 1,
                lineStyle: 2,
                priceLineVisible: true,
                lastValueVisible: true,
                title: 'SL',
            });
        }

        if (tp) {
            tpLine = chart.addLineSeries({
                color: '#00e676',
                lineWidth: 1,
                lineStyle: 2,
                priceLineVisible: true,
                lastValueVisible: true,
                title: 'TP',
            });
        }
    }

    /**
     * Toggle indicators visibility
     */
    function toggleIndicators() {
        showIndicators = !showIndicators;
        
        const visibility = showIndicators;
        if (ema50Line) ema50Line.applyOptions({ visible: visibility });
        if (ema200Line) ema200Line.applyOptions({ visible: visibility });
        if (bbUpperLine) bbUpperLine.applyOptions({ visible: visibility });
        if (bbMiddleLine) bbMiddleLine.applyOptions({ visible: visibility });
        if (bbLowerLine) bbLowerLine.applyOptions({ visible: visibility });
        
        return showIndicators;
    }

    /**
     * Set chart type
     */
    function setChartType(type) {
        chartType = type;
    }

    /**
     * Get current visible data
     */
    function getVisibleData() {
        if (!candleSeries) return [];
        return candleSeries.data() || [];
    }

    return {
        init,
        updateCandles,
        updateLastCandle,
        addTradeMarker,
        drawSLTP,
        toggleIndicators,
        setChartType,
        getVisibleData,
        get chart() { return chart; },
        get hasData() { return hasData; },
    };
})();
