# WeatherMin - Project Documentation

## Overview
WeatherMin is a weather dashboard web application live at **weathermin.org**. It provides comprehensive weather data including forecasts, radar, satellite imagery, air quality, and storm model comparisons.

## Tech Stack
- **Framework**: React 19 with Vite (using rolldown-vite)
- **Styling**: Tailwind CSS v4
- **Maps**: Leaflet + React-Leaflet
- **Icons**: Lucide React
- **Auth**: Clerk (optional, requires `VITE_CLERK_PUBLISHABLE_KEY`)
- **Mobile**: Capacitor for iOS (bundle ID: `org.weathermin.app`)

## Project Structure
```
weather-dashboard/
├── src/
│   ├── App.jsx          # Main component (~3800 lines, contains all UI)
│   └── main.jsx         # Entry point with Clerk provider
├── ios/                 # Capacitor iOS project
├── dist/                # Production build output
├── public/
│   └── icons/           # App icons (icon-192.png, etc.)
├── capacitor.config.json
├── package.json
└── vite.config.js
```

## Main App Component (src/App.jsx)

### State Variables (line 3358+)
- `location` - Current location object {name, lat, lon, state}
- `searchQuery`, `searchResults`, `showResults` - Location search state
- `loading`, `error` - Loading and error states
- `nwsGrid` - NWS grid point data
- `forecast` - NWS 7-day forecast periods
- `hourlyForecast` - NWS hourly forecast
- `alerts` - Active weather alerts
- `modelData` - Open-Meteo GFS model data
- `dailyForecast` - Blended daily forecast (NWS + WeatherAPI + GEM)
- `airQuality` - Air quality index data

### Key UI Components
- `CurrentConditions` (line 247) - Temperature, feels like, humidity, wind, pressure
- `AlertBanner` (line 139) - Weather alerts with auto-cycling display
- `QuickStats` - Summary stats at top
- `AirQualityCard` - AQI display
- `HourlyStrip` - Next 24 hours horizontal scroll
- `SatelliteLoop` - NOAA GOES satellite imagery animation
- `MiniRadar` - Weather radar with Leaflet map
- `TenDayStrip` - 10-day forecast horizontal scroll
- `CalendarMonth` - Monthly calendar view with weather
- `StormModelComparison` - Compare different weather models
- `DataSourcesPage` - Attribution and data source links

### Utility Components
- `Card` (line 116) - Reusable card wrapper with dark mode support
- `TabButton` (line 124) - Tab navigation button
- `LoadingSpinner` (line 108) - Loading indicator

## API Integrations

### Weather Data Sources
1. **NWS (National Weather Service)**
   - Grid points: `api.weather.gov/points/{lat},{lon}`
   - Forecast: `api.weather.gov/gridpoints/{office}/{x},{y}/forecast`
   - Hourly: `api.weather.gov/gridpoints/{office}/{x},{y}/forecast/hourly`
   - Alerts: `api.weather.gov/alerts/active?point={lat},{lon}`

2. **Open-Meteo**
   - GFS Model: `api.open-meteo.com/v1/gfs` (current conditions, hourly)
   - GEM Model: `api.open-meteo.com/v1/gem` (Canadian model for snowfall)
   - Air Quality: `air-quality-api.open-meteo.com/v1/air-quality`
   - Geocoding: `geocoding-api.open-meteo.com/v1/search`

3. **WeatherAPI.com** (requires `WEATHERAPI_KEY` — server-side only, proxied via `/api/weather`)
   - 14-day forecast: `api.weatherapi.com/v1/forecast.json`

4. **Other Services**
   - Zippopotam.us - US zip code lookup
   - Nominatim (OpenStreetMap) - Reverse geocoding

### Data Blending Strategy
The app uses "meteorological day" calculation (6 AM to 6 AM) for daily high/low temps:
- Days 1-7: NWS hourly data processed through `calculateMeteorologicalDay()`
- Days 8-14: WeatherAPI or GEM model fallback
- Snowfall: Takes maximum of WeatherAPI and GEM predictions
- Weather codes: Mapped from NWS text via `nwsTextToWmoCode()`

## Environment Variables
```
VITE_CLERK_PUBLISHABLE_KEY  # Optional - Clerk auth (client-side, safe to expose)
WEATHERAPI_KEY              # Required - WeatherAPI.com API key (server-side only)
```

## Development Commands
```bash
# Start dev server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Lint
npm run lint

# Preview production build
npm run preview
```

## iOS Development (Capacitor)
```bash
# Build and sync to iOS
npm run build && npx cap sync ios

# Open in Xcode
npx cap open ios

# Run on simulator
npx cap run ios --target "SIMULATOR_UUID"

# List available simulators
xcrun simctl list devices available | grep -E "iPhone|iPad"
```

### iOS Project Details
- Location: `ios/`
- Bundle ID: `org.weathermin.app`
- App Name: WeatherMin
- Web assets copied to: `ios/App/App/public`
- Location permission configured in `Info.plist` (`NSLocationWhenInUseUsageDescription`)

## Deployment
- **Production URL**: https://weathermin.org
- **Build output**: `dist/` directory

## Default Location
Cranberry Township, PA (40.6834, -80.1067) - used as fallback if geolocation fails/denied

**Auto-location detection**: On initial load, the app automatically requests geolocation permission and detects the user's location. If denied or unavailable, falls back to the default.

## Features
- Dark mode support (system preference detection via `useColorScheme` hook)
- Location search (city names and US zip codes)
- Geolocation support
- Auto-refresh every 15 minutes
- PWA-ready with app icons
- Responsive design with mobile-first approach
- Safe area insets for iOS notch

## Weather Code Mappings
WMO weather codes are used internally. Key mappings in `getWeatherDescription()` (line 309):
- 0: Clear sky
- 1-3: Mainly clear to overcast
- 45-48: Fog
- 51-55: Drizzle
- 61-67: Rain (slight to freezing)
- 71-77: Snow
- 80-82: Rain showers
- 85-86: Snow showers
- 95-99: Thunderstorms

## External Weather Links (WEATHER_LINKS constant)
Organized categories: Model Data, Radar & Satellite, Severe Weather, Observations
