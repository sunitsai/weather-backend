// Load environment variables from .env file in local development
// This line should be at the very top of your file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch').default; 

const app = express();
const PORT = process.env.PORT || 8080; // OpenShift will set PORT for internal service exposure
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY; // This will come from OpenShift Secret

// --- Debugging Check 1: Verify API Key Loading ---
console.log('Backend starting...');
if (!OPENWEATHER_API_KEY) {
    console.error('ERROR: OPENWEATHER_API_KEY is not set! Weather fetching will fail.');
    console.warn('Please ensure you have created an OpenShift Secret and configured your Deployment to inject it.');
    console.warn('For local testing, create a .env file with OPENWEATHER_API_KEY=YOUR_KEY_HERE');
} else {
    console.log('OpenWeatherMap API Key loaded (first 5 chars):', OPENWEATHER_API_KEY.substring(0, 5) + '...');
}
// --- End Debugging Check 1 ---

// Configure CORS to allow requests from your React frontend.
// In production, replace '*' with your actual React app's OpenShift Route hostname.
app.use(cors({
    origin: '*' // Allow all origins for development. Be specific in production!
}));

// API Endpoint to fetch weather data
app.get('/api/weather', async (req, res) => {
    const city = req.query.city;

    // --- Debugging Check 2: Verify City Parameter ---
    console.log(`Received request for city: ${city}`);
    if (!city) {
        console.log('Missing city parameter.');
        return res.status(400).json({ error: 'City parameter is required.' });
    }
    // --- End Debugging Check 2 ---

    if (!OPENWEATHER_API_KEY) {
        // This check is duplicated, but good for robustness
        console.error('OPENWEATHER_API_KEY is missing during API call attempt.');
        return res.status(500).json({ error: 'Server is not configured with the API key.' });
    }

    const openWeatherMapUrl = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=metric`;

    // --- Debugging Check 3: Log the external API URL (without sensitive key) ---
    console.log(`Fetching from external API: ${openWeatherMapUrl.split('&appid=')[0]}&appid=...`);
    // --- End Debugging Check 3 ---

    try {
        const response = await fetch(openWeatherMapUrl);
        const data = await response.json();

        // --- Debugging Check 4: Log External API Response Status ---
        console.log(`External API response status: ${response.status}`);
        if (!response.ok) {
            console.error('External API error:', data.message || 'Unknown error');
            return res.status(response.status).json({ error: data.message || 'Error fetching weather data from external API' });
        }
        // --- End Debugging Check 4 ---

        // Extract relevant data to send back to the frontend
        const weatherInfo = {
            city: data.name,
            country: data.sys.country,
            temperature: data.main.temp,
            feelsLike: data.main.feels_like,
            description: data.weather[0].description,
            icon: data.weather[0].icon,
            humidity: data.main.humidity
        };

        res.json(weatherInfo);

    } catch (error) {
        // --- Debugging Check 5: Log Backend Fetch Errors ---
        console.error('Backend failed to fetch weather:', error);
        // --- End Debugging Check 5 ---
        res.status(500).json({ error: 'Failed to fetch weather data.' });
    }
});

// Basic health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('Backend is healthy!');
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server listening on port ${PORT}`);
    // --- Debugging Check 6: Confirm Server Start ---
    console.log(`Access backend via: http://localhost:${PORT}/api/weather?city=London (for local testing)`);
    // --- End Debugging Check 6 ---
});
