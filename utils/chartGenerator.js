const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const Chart = require('chart.js/auto');

// Configure the chart canvas
const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width: 800,
    height: 400,
    backgroundColour: 'white'
});

async function createChart(address) {
    try {
        // Example chart configuration
        const configuration = {
            type: 'line',
            data: {
                labels: [], // Your time labels
                datasets: [{
                    label: 'Price',
                    data: [], // Your price data
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Token Price Chart'
                    }
                }
            }
        };

        // Generate chart image
        const image = await chartJSNodeCanvas.renderToBuffer(configuration);
        return image;
    } catch (error) {
        throw new Error(`Failed to generate chart: ${error.message}`);
    }
}

module.exports = {
    createChart
}; 