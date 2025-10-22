"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
const fetchBinance_1 = require("../src/data/fetchBinance");
const ForecastEngine_1 = require("../src/ForecastEngine");
async function handler(req, res) {
    const { symbol = 'BTCUSDT' } = req.query;
    try {
        const data = await (0, fetchBinance_1.fetchBinanceData)(symbol);
        const engine = new ForecastEngine_1.ForecastEngine();
        const forecast = await engine.analyze(data);
        return res.status(200).json(forecast);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
