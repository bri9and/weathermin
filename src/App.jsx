import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from '@clerk/clerk-react'
import {
  Search,
  MapPin,
  Thermometer,
  Droplets,
  Wind,
  CloudRain,
  Sun,
  Cloud,
  CloudSnow,
  CloudLightning,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Gauge,
  Eye,
  Compass,
  TrendingUp,
  Clock,
  Calendar,
  Zap,
  Activity,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Navigation,
  Snowflake,
  LogIn,
} from 'lucide-react'
import { MapContainer, TileLayer, useMap, GeoJSON, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Hook to detect user's color scheme preference
function useColorScheme() {
  const [isDark, setIsDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isDark
}

const MAP_TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

const DEFAULT_LOCATION = {
  name: 'Cranberry Township, PA',
  lat: 40.6834,
  lon: -80.1067,
  state: 'PA',
}


const WEATHER_LINKS = {
  'Model Data': [
    { name: 'NWS Models Page', url: 'https://www.weather.gov/rnk/models' },
    { name: 'NOMADS (GRIB2)', url: 'https://nomads.ncep.noaa.gov/' },
    { name: 'Open-Meteo GFS API', url: 'https://open-meteo.com/en/docs/gfs-api' },
    { name: 'Tropical Tidbits', url: 'https://www.tropicaltidbits.com/analysis/models/' },
  ],
  'Radar & Satellite': [
    { name: 'NWS Radar', url: 'https://radar.weather.gov/' },
    { name: 'College of DuPage', url: 'https://weather.cod.edu/satrad/' },
    { name: 'GOES-East Imagery', url: 'https://www.star.nesdis.noaa.gov/GOES/index.php' },
    { name: 'Windy.com', url: 'https://www.windy.com/' },
    { name: 'Zoom Earth', url: 'https://zoom.earth/' },
  ],
  'Severe Weather': [
    { name: 'SPC Outlooks', url: 'https://www.spc.noaa.gov/' },
    { name: 'WPC Surface Analysis', url: 'https://www.wpc.ncep.noaa.gov/' },
    { name: 'NHC (Tropical)', url: 'https://www.nhc.noaa.gov/' },
    { name: 'Active Alerts', url: 'https://alerts.weather.gov/' },
  ],
  'Observations': [
    { name: 'MesoWest', url: 'https://mesowest.utah.edu/' },
    { name: 'Weather Underground', url: 'https://www.wunderground.com/' },
    { name: 'ASOS/AWOS Data', url: 'https://www.weather.gov/asos/' },
  ],
}

const RAW_DATA_SOURCES = {
  'Forecast APIs': [
    { name: 'Open-Meteo (GFS/HRRR)', url: 'https://api.open-meteo.com/v1/gfs' },
    { name: 'Open-Meteo (Canadian GEM)', url: 'https://api.open-meteo.com/v1/gem' },
    { name: 'NWS API', url: 'https://api.weather.gov' },
  ],
  'Radar & Satellite': [
    { name: 'RainViewer Radar Tiles', url: 'https://api.rainviewer.com/public/weather-maps.json' },
    { name: 'GOES-East (NOAA)', url: 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR' },
    { name: 'GOES-West (NOAA)', url: 'https://cdn.star.nesdis.noaa.gov/GOES18/ABI/SECTOR' },
    { name: 'MRMS Radar (NOAA)', url: 'https://mrms.ncep.noaa.gov/data/' },
  ],
  'Air Quality & UV': [
    { name: 'Open-Meteo Air Quality', url: 'https://air-quality-api.open-meteo.com/v1/air-quality' },
    { name: 'AirNow API', url: 'https://www.airnowapi.org/' },
    { name: 'EPA AQS Data', url: 'https://aqs.epa.gov/aqsweb/documents/data_api.html' },
  ],
  'Alerts & Warnings': [
    { name: 'NWS Alerts API', url: 'https://api.weather.gov/alerts/active' },
    { name: 'NWS CAP Feeds', url: 'https://alerts.weather.gov/' },
  ],
}

function getWeatherIcon(forecast) {
  const lower = forecast?.toLowerCase() || ''
  if (lower.includes('thunder') || lower.includes('lightning')) return CloudLightning
  if (lower.includes('snow') || lower.includes('flurr')) return CloudSnow
  if (lower.includes('rain') || lower.includes('shower') || lower.includes('drizzle')) return CloudRain
  if (lower.includes('cloud') || lower.includes('overcast')) return Cloud
  return Sun
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
    </div>
  )
}

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-lg shadow-blue-100/50 dark:shadow-none border border-blue-100 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-200 ${
        active
          ? 'bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-none'
          : 'text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function AlertBanner({ alerts }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [hasCompleted, setHasCompleted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const isDark = useColorScheme()

  // Auto-cycle through alerts every 5 seconds
  useEffect(() => {
    if (!alerts || alerts.length === 0 || hasCompleted || isExpanded) return

    const timer = setTimeout(() => {
      if (currentIndex < alerts.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        setHasCompleted(true)
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [currentIndex, alerts, hasCompleted, isExpanded])

  // Reset when alerts change
  useEffect(() => {
    setCurrentIndex(0)
    setHasCompleted(false)
  }, [alerts?.length])

  if (!alerts || alerts.length === 0) return null

  const currentAlert = alerts[currentIndex]

  // Theme-aware styles
  const bannerBg = isDark ? 'bg-amber-500/10' : 'bg-amber-50'
  const bannerBorder = isDark ? 'border-amber-500/30' : 'border-amber-300'
  const textPrimary = isDark ? 'text-amber-200' : 'text-amber-800'
  const textSecondary = isDark ? 'text-amber-200/60' : 'text-amber-600'
  const textMuted = isDark ? 'text-amber-200/40' : 'text-amber-500'
  const iconColor = isDark ? 'text-amber-400' : 'text-amber-500'
  const dismissText = isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'

  // Show button to view alerts after cycling completes
  if (hasCompleted && !isExpanded) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2 px-4 py-2 ${bannerBg} border ${bannerBorder} rounded-lg hover:bg-amber-500/20 transition-colors`}
        >
          <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
          <span className={`${textPrimary} text-sm font-medium`}>
            {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
          </span>
        </button>
      </div>
    )
  }

  // Show expanded view with all alerts
  if (isExpanded) {
    return (
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between mb-2">
          <span className={`${textPrimary} text-sm font-medium`}>
            {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              setIsExpanded(false)
              setHasCompleted(true)
            }}
            className={`${dismissText} text-sm`}
          >
            Dismiss
          </button>
        </div>
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 ${bannerBg} border ${bannerBorder} rounded-lg`}
          >
            <AlertTriangle className={`w-5 h-5 ${iconColor} shrink-0`} />
            <div className="flex-1 min-w-0">
              <p className={`${textPrimary} font-medium truncate`}>{alert.properties?.headline}</p>
              <p className={`${textSecondary} text-sm truncate`}>{alert.properties?.areaDesc}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Show single alert cycling view
  return (
    <div className="mb-6">
      <div className={`flex items-center gap-3 p-3 ${bannerBg} border ${bannerBorder} rounded-lg animate-fade-in`}>
        <AlertTriangle className={`w-5 h-5 ${iconColor} shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`${textPrimary} font-medium truncate`}>{currentAlert?.properties?.headline}</p>
          <p className={`${textSecondary} text-sm truncate`}>{currentAlert?.properties?.areaDesc}</p>
        </div>
        <div className={`text-xs ${textMuted} shrink-0`}>
          {currentIndex + 1}/{alerts.length}
        </div>
      </div>
    </div>
  )
}

function CurrentConditions({ data, location }) {
  if (!data) return null

  const current = data.current
  const units = data.current_units

  return (
    <Card className="mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm mb-1">
            <MapPin className="w-4 h-4" />
            <span>{location.name}</span>
          </div>
          <div className="text-5xl font-light text-slate-800 dark:text-white">
            {Math.round(current.temperature_2m)}°
            <span className="text-2xl text-slate-500 dark:text-slate-400">F</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-500 dark:text-slate-400 text-sm">Feels like</div>
          <div className="text-2xl text-slate-700 dark:text-slate-200">
            {Math.round(current.apparent_temperature)}°F
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-sky-500" />
          <div>
            <div className="text-xs text-slate-500">Humidity</div>
            <div className="text-slate-700 dark:text-slate-200">{current.relative_humidity_2m}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-emerald-500" />
          <div>
            <div className="text-xs text-slate-500">Wind</div>
            <div className="text-slate-700 dark:text-slate-200">{Math.round(current.wind_speed_10m)} mph</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-500" />
          <div>
            <div className="text-xs text-slate-500">Direction</div>
            <div className="text-slate-700 dark:text-slate-200">{current.wind_direction_10m}°</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-rose-500" />
          <div>
            <div className="text-xs text-slate-500">Pressure</div>
            <div className="text-slate-700 dark:text-slate-200">{Math.round(current.surface_pressure)} mb</div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Weather code to description mapping
const getWeatherDescription = (code) => {
  const descriptions = {
    0: 'Clear sky',
    1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    66: 'Light freezing rain', 67: 'Heavy freezing rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    85: 'Slight snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
  }
  return descriptions[code] || 'Unknown'
}

const getWeatherIconFromCode = (code) => {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return CloudSnow
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain
  if ([95, 96, 99].includes(code)) return CloudLightning
  if ([2, 3, 45, 48].includes(code)) return Cloud
  return Sun
}

// AQI level descriptions and colors
const getAqiLevel = (aqi) => {
  if (aqi <= 50) return { label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-500/20' }
  if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-500/20' }
  if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: 'text-orange-400', bg: 'bg-orange-500/20' }
  if (aqi <= 200) return { label: 'Unhealthy', color: 'text-red-400', bg: 'bg-red-500/20' }
  if (aqi <= 300) return { label: 'Very Unhealthy', color: 'text-purple-400', bg: 'bg-purple-500/20' }
  return { label: 'Hazardous', color: 'text-rose-400', bg: 'bg-rose-500/20' }
}

// UV level descriptions
const getUvLevel = (uv) => {
  if (uv <= 2) return { label: 'Low', color: 'text-emerald-400' }
  if (uv <= 5) return { label: 'Moderate', color: 'text-yellow-400' }
  if (uv <= 7) return { label: 'High', color: 'text-orange-400' }
  if (uv <= 10) return { label: 'Very High', color: 'text-red-400' }
  return { label: 'Extreme', color: 'text-purple-400' }
}

function ConditionsCard({ modelData, dailyForecast, airQuality }) {
  if (!modelData || !dailyForecast) return null

  const current = modelData.current
  const dailyCurrent = dailyForecast.current
  const daily = dailyForecast.daily
  const aqi = airQuality?.current

  const uvIndex = dailyCurrent?.uv_index ?? daily?.uv_index_max?.[0] ?? 0
  const uvLevel = getUvLevel(uvIndex)
  const aqiValue = aqi?.us_aqi ?? 0
  const aqiLevel = getAqiLevel(aqiValue)

  const sunrise = daily?.sunrise?.[0]
  const sunset = daily?.sunset?.[0]
  const sunriseTime = sunrise ? new Date(sunrise).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--'
  const sunsetTime = sunset ? new Date(sunset).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '--'

  const visibility = dailyCurrent?.visibility
  const visibilityMiles = visibility ? (visibility / 1609.34).toFixed(1) : '--'

  const dewPoint = dailyCurrent?.dew_point_2m ?? '--'

  return (
    <Card className="mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Air Quality */}
        <div className={`p-3 rounded-lg ${aqiLevel.bg}`}>
          <div className="text-xs text-slate-400 mb-1">Air Quality</div>
          <div className={`text-2xl font-light ${aqiLevel.color}`}>{aqiValue}</div>
          <div className={`text-sm ${aqiLevel.color}`}>{aqiLevel.label}</div>
        </div>

        {/* UV Index */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/30">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">UV Index</div>
          <div className={`text-2xl font-light ${uvLevel.color}`}>{uvIndex.toFixed(1)}</div>
          <div className={`text-sm ${uvLevel.color}`}>{uvLevel.label}</div>
        </div>

        {/* Humidity */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/30">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Droplets className="w-3 h-3" />
            Humidity
          </div>
          <div className="text-2xl font-light text-slate-700 dark:text-slate-200">{current.relative_humidity_2m}%</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">Dew {Math.round(dewPoint)}°F</div>
        </div>

        {/* Visibility */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/30">
          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Eye className="w-3 h-3" />
            Visibility
          </div>
          <div className="text-2xl font-light text-slate-700 dark:text-slate-200">{visibilityMiles}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">miles</div>
        </div>

        {/* Sunrise */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/30">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sunrise</div>
          <div className="text-2xl font-light text-amber-500 dark:text-amber-400">{sunriseTime}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">AM</div>
        </div>

        {/* Sunset */}
        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-700/30">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sunset</div>
          <div className="text-2xl font-light text-orange-500 dark:text-orange-400">{sunsetTime}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">PM</div>
        </div>
      </div>

      {/* Air Quality Details */}
      {aqi && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Air Quality Details</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-slate-500">PM2.5</span>
              <span className="ml-2 text-slate-700 dark:text-slate-300">{aqi.pm2_5?.toFixed(1)} µg/m³</span>
            </div>
            <div>
              <span className="text-slate-500">PM10</span>
              <span className="ml-2 text-slate-700 dark:text-slate-300">{aqi.pm10?.toFixed(1)} µg/m³</span>
            </div>
            <div>
              <span className="text-slate-500">Ozone</span>
              <span className="ml-2 text-slate-700 dark:text-slate-300">{aqi.ozone?.toFixed(1)} µg/m³</span>
            </div>
            <div>
              <span className="text-slate-500">NO₂</span>
              <span className="ml-2 text-slate-700 dark:text-slate-300">{aqi.nitrogen_dioxide?.toFixed(1)} µg/m³</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

// Air Quality Card - compact display for main page
function AirQualityCard({ airQuality }) {
  if (!airQuality?.current) return null

  const aqi = airQuality.current
  const aqiValue = aqi.us_aqi ?? 0
  const aqiLevel = getAqiLevel(aqiValue)

  // Get color based on pollutant level (simplified thresholds)
  const getPollutantColor = (type, value) => {
    if (!value) return 'bg-slate-200 dark:bg-slate-600'
    const thresholds = {
      pm2_5: [12, 35, 55, 150],
      pm10: [54, 154, 254, 354],
      ozone: [50, 100, 130, 165],
      no2: [53, 100, 360, 649]
    }
    const t = thresholds[type] || [50, 100, 150, 200]
    if (value <= t[0]) return 'bg-emerald-400'
    if (value <= t[1]) return 'bg-yellow-400'
    if (value <= t[2]) return 'bg-orange-400'
    if (value <= t[3]) return 'bg-red-400'
    return 'bg-purple-400'
  }

  const pollutants = [
    { key: 'pm2_5', label: 'PM2.5', value: aqi.pm2_5, unit: 'µg/m³' },
    { key: 'pm10', label: 'PM10', value: aqi.pm10, unit: 'µg/m³' },
    { key: 'ozone', label: 'Ozone', value: aqi.ozone, unit: 'µg/m³' },
    { key: 'no2', label: 'NO₂', value: aqi.nitrogen_dioxide, unit: 'µg/m³' }
  ]

  return (
    <Card className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* AQI Score */}
        <div className="flex items-center gap-4">
          <div className={`w-20 h-20 rounded-xl ${aqiLevel.bg} flex flex-col items-center justify-center`}>
            <div className={`text-3xl font-bold ${aqiLevel.color}`}>{aqiValue}</div>
            <div className={`text-xs ${aqiLevel.color}`}>AQI</div>
          </div>
          <div>
            <div className={`text-xl font-semibold ${aqiLevel.color}`}>{aqiLevel.label}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Air Quality</div>
          </div>
        </div>

        {/* Pollutant Bars */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {pollutants.map(p => (
            <div key={p.key} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{p.label}</span>
                <span className={`w-2 h-2 rounded-full ${getPollutantColor(p.key, p.value)}`}></span>
              </div>
              <div className="text-lg font-semibold text-slate-800 dark:text-white">{p.value?.toFixed(1) ?? '--'}</div>
              <div className="text-xs text-slate-400">{p.unit}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

// Animated zoom component for fly-in effect
function ZoomAnimator({ center, startZoom, endZoom, onZoomComplete }) {
  const map = useMap()
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current) return
    hasAnimated.current = true

    // Wait for map to be ready
    const startAnimation = () => {
      // Start at wide zoom
      map.setView(center, startZoom, { animate: false })

      // Delay then fly to target
      setTimeout(() => {
        map.flyTo(center, endZoom, {
          duration: 2,
        })

        // Listen for zoom end event
        map.once('zoomend', () => {
          onZoomComplete?.()
        })

        // Fallback timeout in case event doesn't fire
        setTimeout(() => {
          onZoomComplete?.()
        }, 2500)
      }, 300)
    }

    // Check if map is ready
    if (map._loaded) {
      startAnimation()
    } else {
      map.once('load', startAnimation)
    }
  }, [map, center, startZoom, endZoom, onZoomComplete])

  return null
}

function MiniRadar({ location }) {
  const [radarFrames, setRadarFrames] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [zoomComplete, setZoomComplete] = useState(false)
  const isDark = useColorScheme()
  const center = useMemo(() => [location.lat, location.lon], [location.lat, location.lon])
  const handleZoomComplete = useCallback(() => setZoomComplete(true), [])

  // Fetch radar frames with local caching for extended history (up to 4 hours)
  useEffect(() => {
    const CACHE_KEY = 'radar_frame_cache'
    const MAX_AGE_HOURS = 4
    const MAX_AGE_SECONDS = MAX_AGE_HOURS * 60 * 60

    const fetchRadar = async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        const data = await res.json()
        const newFrames = (data.radar.past || []).concat(data.radar.nowcast || [])

        // Load cached frames from localStorage
        let cachedFrames = []
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) cachedFrames = JSON.parse(cached)
        } catch (e) {}

        // Merge cached and new frames, removing duplicates by timestamp
        const frameMap = new Map()
        const now = Math.floor(Date.now() / 1000)
        const cutoff = now - MAX_AGE_SECONDS

        // Add cached frames (filter old ones)
        cachedFrames.forEach(f => {
          if (f.time >= cutoff) frameMap.set(f.time, f)
        })

        // Add new frames (overwrites duplicates)
        newFrames.forEach(f => frameMap.set(f.time, f))

        // Sort by time and convert back to array
        const allFrames = Array.from(frameMap.values()).sort((a, b) => a.time - b.time)

        // Cache the merged frames
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(allFrames.filter(f => f.time <= now)))
        } catch (e) {}

        setRadarFrames(allFrames)
        setCurrentFrame(0) // Start from oldest
      } catch (err) {
        console.error('Failed to fetch radar:', err)
      }
    }
    fetchRadar()
    const interval = setInterval(fetchRadar, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-play animation (only starts after zoom-in completes)
  useEffect(() => {
    if (radarFrames.length === 0 || !zoomComplete) return
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % radarFrames.length)
    }, 1500) // Slower animation
    return () => clearInterval(interval)
  }, [radarFrames.length, zoomComplete])

  const currentRadarUrl = radarFrames[currentFrame]
    ? `https://tilecache.rainviewer.com${radarFrames[currentFrame].path}/256/{z}/{x}/{y}/4/1_1.png`
    : null

  const frameTime = radarFrames[currentFrame]
    ? new Date(radarFrames[currentFrame].time * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : ''

  // Calculate time range for display
  const timeRange = useMemo(() => {
    if (radarFrames.length < 2) return ''
    const oldest = radarFrames[0]?.time
    const newest = radarFrames[radarFrames.length - 1]?.time
    if (!oldest || !newest) return ''
    const hours = Math.round((newest - oldest) / 3600 * 10) / 10
    return `${hours}h`
  }, [radarFrames])

  return (
    <Card className="p-0 overflow-hidden rounded-xl">
      <div className="h-[375px] relative">
        <MapContainer
          center={center}
          zoom={3}
          className="h-full w-full"
          style={{ background: isDark ? '#1e293b' : '#f1f5f9' }}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          boxZoom={false}
          keyboard={false}
        >
          <ZoomAnimator
            center={center}
            startZoom={3}
            endZoom={8}
            onZoomComplete={handleZoomComplete}
          />
          <TileLayer url={isDark ? MAP_TILES.dark : MAP_TILES.light} />
          {currentRadarUrl && <TileLayer url={currentRadarUrl} opacity={0.7} />}
        </MapContainer>
        {/* Title overlay */}
        <div className={`absolute top-3 left-3 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium z-[1000] ${isDark ? 'bg-slate-900/80 text-white' : 'bg-white/90 text-slate-800 shadow-sm'}`}>
          Live Radar
        </div>
        {/* Time indicator */}
        <div className={`absolute bottom-3 left-3 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm z-[1000] flex items-center gap-2 ${isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-white/90 text-slate-600 shadow-sm'}`}>
          <span className={`w-2 h-2 rounded-full ${zoomComplete ? 'bg-red-500 animate-pulse' : 'bg-sky-500 animate-ping'}`}></span>
          {zoomComplete ? (
            <>
              {frameTime}
              {timeRange && <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>({timeRange})</span>}
            </>
          ) : (
            <span className="text-sky-500">Zooming in...</span>
          )}
        </div>
        {/* Progress bar */}
        <div className={`absolute bottom-0 left-0 right-0 h-1.5 z-[1000] ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${((currentFrame + 1) / radarFrames.length) * 100}%` }}
          />
        </div>
      </div>
    </Card>
  )
}

// GOES Satellite Loop - animated satellite imagery from local frames
function SatelliteLoop({ location }) {
  const isDark = useColorScheme()
  const [currentFrame, setCurrentFrame] = useState(0)
  const [loading, setLoading] = useState(true)

  // Local satellite frames (downloaded from NOAA)
  const frames = [
    '/satellite/20260232106_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232111_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232116_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232121_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232126_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232131_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232136_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232141_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232146_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232151_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232156_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232201_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232206_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232211_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232216_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232221_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232226_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232231_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232236_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232241_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232246_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232251_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232256_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
    '/satellite/20260232301_GOES19-ABI-umv-GEOCOLOR-1200x1200.jpg',
  ]

  const name = 'Upper Mississippi Valley'
  const noaaUrl = 'https://www.star.nesdis.noaa.gov/GOES/sector_band.php?sat=G19&sector=umv&band=GEOCOLOR&length=24'

  // Preload all frames
  useEffect(() => {
    let loadedCount = 0
    frames.forEach(src => {
      const img = new Image()
      img.onload = () => {
        loadedCount++
        if (loadedCount >= 3) setLoading(false)
      }
      img.src = src
    })
    // Fallback timeout
    setTimeout(() => setLoading(false), 3000)
  }, [])

  // Animate through frames
  useEffect(() => {
    if (loading) return
    const interval = setInterval(() => {
      setCurrentFrame(prev => (prev + 1) % frames.length)
    }, 150) // 150ms per frame for smooth animation
    return () => clearInterval(interval)
  }, [loading, frames.length])

  // Get time from filename (format: YYYYDDDHHMI)
  const getTimeFromFrame = (frame) => {
    const match = frame.match(/(\d{4})(\d{3})(\d{2})(\d{2})_/)
    if (match) {
      const hour = parseInt(match[3])
      const minute = match[4]
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const hour12 = hour % 12 || 12
      return `${hour12}:${minute} ${ampm} UTC`
    }
    return ''
  }

  const frameTime = getTimeFromFrame(frames[currentFrame])

  return (
    <Card className="p-0 overflow-hidden rounded-xl">
      <div className="h-[375px] relative bg-slate-900">
        {loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
            <span className="text-slate-400 text-sm">Loading satellite loop...</span>
          </div>
        ) : (
          <img
            src={frames[currentFrame]}
            alt={`GOES Satellite - ${name}`}
            className="w-full h-full object-cover"
          />
        )}
        {/* Title overlay */}
        <div className={`absolute top-3 left-3 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium z-10 ${isDark ? 'bg-slate-900/80 text-white' : 'bg-white/90 text-slate-800 shadow-sm'}`}>
          Satellite Loop
        </div>
        {/* Time indicator */}
        {!loading && (
          <div className={`absolute bottom-3 left-3 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm z-10 flex items-center gap-2 ${isDark ? 'bg-slate-900/80 text-slate-300' : 'bg-white/90 text-slate-600 shadow-sm'}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {frameTime} • {name}
          </div>
        )}
        {/* Progress bar */}
        {!loading && (
          <div className={`absolute bottom-0 left-0 right-0 h-1.5 z-10 ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
            <div
              className="h-full bg-green-500 transition-all duration-150"
              style={{ width: `${((currentFrame + 1) / frames.length) * 100}%` }}
            />
          </div>
        )}
        {/* Link to NOAA */}
        <a
          href={noaaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`absolute top-3 right-3 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs z-10 flex items-center gap-1 hover:scale-105 transition-transform ${isDark ? 'bg-slate-900/80 text-slate-400 hover:text-white' : 'bg-white/90 text-slate-500 hover:text-slate-800 shadow-sm'}`}
        >
          NOAA <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </Card>
  )
}

// Quick Stats Panel - minimalist weather info
function QuickStats({ modelData, dailyForecast, airQuality }) {
  const isDark = useColorScheme()

  if (!modelData?.current || !dailyForecast?.daily) return null

  const current = modelData.current
  const daily = dailyForecast.daily
  const today = dailyForecast.current

  const high = Math.round(daily.temperature_2m_max[0])
  const low = Math.round(daily.temperature_2m_min[0])
  const currentTemp = Math.round(current.temperature_2m)
  const feelsLike = Math.round(current.apparent_temperature)
  const humidity = current.relative_humidity_2m
  const windSpeed = Math.round(current.wind_speed_10m)
  const precip = daily.precipitation_probability_max[0]
  const rain = daily.precipitation_sum[0]
  const snow = daily.snowfall_sum[0] / 2.54 // cm to inches
  const uvIndex = today?.uv_index || 0
  const visibility = today?.visibility ? Math.round(today.visibility / 1609.34) : null // m to miles
  const dewPoint = today?.dew_point_2m ? Math.round(today.dew_point_2m) : null
  const aqi = airQuality?.current?.us_aqi

  const getAqiLabel = (aqi) => {
    if (!aqi) return { label: '--', color: 'text-slate-400' }
    if (aqi <= 50) return { label: 'Good', color: 'text-green-500' }
    if (aqi <= 100) return { label: 'Moderate', color: 'text-yellow-500' }
    if (aqi <= 150) return { label: 'Unhealthy*', color: 'text-orange-500' }
    if (aqi <= 200) return { label: 'Unhealthy', color: 'text-red-500' }
    return { label: 'Hazardous', color: 'text-purple-500' }
  }

  const getUvLabel = (uv) => {
    if (uv <= 2) return { label: 'Low', color: 'text-green-500' }
    if (uv <= 5) return { label: 'Moderate', color: 'text-yellow-500' }
    if (uv <= 7) return { label: 'High', color: 'text-orange-500' }
    if (uv <= 10) return { label: 'Very High', color: 'text-red-500' }
    return { label: 'Extreme', color: 'text-purple-500' }
  }

  const aqiInfo = getAqiLabel(aqi)
  const uvInfo = getUvLabel(uvIndex)

  const StatRow = ({ label, value, unit = '', className = '' }) => (
    <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
      <span className="text-slate-600 dark:text-slate-400 text-sm">{label}</span>
      <span className={`font-semibold text-slate-800 dark:text-white ${className}`}>{value}{unit}</span>
    </div>
  )

  return (
    <Card className="p-0 overflow-hidden rounded-xl">
      <div className="h-[375px] flex flex-col justify-between p-4">
        <StatRow label="Current" value={currentTemp} unit="°" />
        <StatRow label="Feels Like" value={feelsLike} unit="°" />
        <StatRow label="High" value={high} unit="°" className="text-rose-500" />
        <StatRow label="Low" value={low} unit="°" className="text-blue-500" />
        <StatRow label="Humidity" value={humidity} unit="%" />
        <StatRow label="Wind" value={windSpeed} unit=" mph" />
        <StatRow label="Precip" value={precip} unit="%" />
        <StatRow label="UV" value={`${Math.round(uvIndex)} ${uvInfo.label}`} className={uvInfo.color} />
        <StatRow label="AQI" value={aqi ? `${aqi} ${aqiInfo.label}` : '--'} className={aqiInfo.color} />
      </div>
    </Card>
  )
}

// Compact Hourly Forecast Strip
function HourlyStrip({ modelData, dailyForecast }) {
  const isDark = useColorScheme()

  if (!modelData?.hourly) return null

  const hourly = modelData.hourly
  const now = new Date()
  const currentHour = now.getHours()

  // Find the starting index for current hour
  const startIdx = hourly.time.findIndex(t => {
    const hour = new Date(t).getHours()
    const date = new Date(t).toDateString()
    return hour >= currentHour && date === now.toDateString()
  }) || 0

  // Get next 24 hours
  const hours = hourly.time.slice(startIdx, startIdx + 24)

  // Get today's high/low from daily forecast
  const todayHigh = dailyForecast?.daily?.temperature_2m_max?.[0]
  const todayLow = dailyForecast?.daily?.temperature_2m_min?.[0]

  // Calculate temp range for gradient coloring
  const temps = hours.map((_, i) => hourly.temperature_2m[startIdx + i])
  const minTemp = Math.min(...temps)
  const maxTemp = Math.max(...temps)
  const tempRange = maxTemp - minTemp || 1

  // Get temp color based on value
  const getTempColor = (temp) => {
    if (temp <= 32) return 'from-blue-500 to-blue-400'
    if (temp <= 50) return 'from-cyan-500 to-cyan-400'
    if (temp <= 65) return 'from-emerald-500 to-emerald-400'
    if (temp <= 75) return 'from-yellow-500 to-yellow-400'
    if (temp <= 85) return 'from-orange-500 to-orange-400'
    return 'from-red-500 to-red-400'
  }

  return (
    <Card className="mb-6 p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800">
        <h3 className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          Next 24 Hours
        </h3>
        {todayHigh !== undefined && todayLow !== undefined && (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-500 font-bold">{Math.round(todayHigh)}°</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-blue-500 font-bold">{Math.round(todayLow)}°</span>
            </span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <div className="flex" style={{ minWidth: 'max-content' }}>
          {hours.map((timeStr, i) => {
            const idx = startIdx + i
            const time = new Date(timeStr)
            const hour = time.getHours()
            const isNow = i === 0
            const temp = Math.round(hourly.temperature_2m[idx])
            const weatherCode = hourly.weather_code[idx]
            const Icon = getWeatherIconFromCode(weatherCode)
            const precipProb = hourly.precipitation_probability[idx]
            const precipitation = hourly.precipitation?.[idx] || 0 // mm
            const snowfall = hourly.snowfall?.[idx] || 0 // cm
            const snowInches = snowfall / 2.54 // convert to inches
            const rainInches = precipitation / 25.4 // convert to inches
            const isSnowy = [71, 73, 75, 77, 85, 86].includes(weatherCode)
            const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode)
            const isNight = hour < 6 || hour >= 20

            return (
              <div
                key={i}
                className={`flex flex-col items-center py-3 px-2 min-w-[68px] transition-all ${
                  isNow
                    ? 'bg-gradient-to-b from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-900/20 border-x-2 border-blue-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}
              >
                {/* Time */}
                <div className={`text-xs font-bold mb-2 ${isNow ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isNow ? 'NOW' : hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`}
                </div>

                {/* Weather Icon */}
                <div className={`p-1.5 rounded-full mb-2 ${
                  isSnowy ? 'bg-blue-100 dark:bg-blue-900/30' :
                  isRainy ? 'bg-slate-100 dark:bg-slate-700/50' :
                  isNight ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                  'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    isSnowy ? 'text-blue-500' :
                    isRainy ? 'text-slate-500 dark:text-slate-400' :
                    isNight ? 'text-indigo-400' :
                    'text-amber-500'
                  }`} />
                </div>

                {/* Temperature pill */}
                <div className={`bg-gradient-to-r ${getTempColor(temp)} text-white text-sm font-bold px-2.5 py-1 rounded-full shadow-sm`}>
                  {temp}°
                </div>

                {/* Snowfall */}
                {snowInches >= 0.1 && (
                  <div className="flex items-center gap-0.5 mt-2">
                    <Snowflake className="w-3 h-3 text-sky-400" />
                    <span className="text-xs font-semibold text-sky-400">{snowInches.toFixed(1)}"</span>
                  </div>
                )}

                {/* Rain */}
                {rainInches >= 0.01 && !snowInches && (
                  <div className="flex items-center gap-0.5 mt-2">
                    <Droplets className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-500">{rainInches.toFixed(2)}"</span>
                  </div>
                )}

                {/* Precipitation probability (only if no actual precip shown) */}
                {precipProb > 30 && !snowInches && rainInches < 0.01 && (
                  <div className="flex items-center gap-0.5 mt-2">
                    <Droplets className="w-3 h-3 text-blue-400/70" />
                    <span className="text-xs font-medium text-blue-400/70">{precipProb}%</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// Practical Weather Brief - what you need to know before heading out
function WeatherBrief({ modelData, dailyForecast, airQuality, location }) {
  const brief = useMemo(() => {
    if (!modelData?.current || !dailyForecast?.daily) return null

    const current = modelData.current
    const daily = dailyForecast.daily
    const temp = Math.round(current.temperature_2m)
    const feelsLike = Math.round(current.apparent_temperature)
    const weatherCode = current.weather_code
    const humidity = current.relative_humidity_2m
    const windSpeed = Math.round(current.wind_speed_10m)
    const uvIndex = dailyForecast.current?.uv_index || 0
    const todayHigh = Math.round(daily.temperature_2m_max[0])
    const todayLow = Math.round(daily.temperature_2m_min[0])
    const precipProb = daily.precipitation_probability_max[0] || 0
    const rainfall = daily.precipitation_sum[0] || 0
    const snowfall = (daily.snowfall_sum[0] || 0) / 2.54
    const aqi = airQuality?.current?.us_aqi
    const visibility = dailyForecast.current?.visibility

    // What to wear
    const wear = []
    if (temp <= 20) {
      wear.push('Heavy winter coat', 'Hat & gloves', 'Layers')
    } else if (temp <= 32) {
      wear.push('Winter coat', 'Gloves', 'Warm layers')
    } else if (temp <= 45) {
      wear.push('Heavy jacket', 'Light gloves optional')
    } else if (temp <= 60) {
      wear.push('Light jacket or sweater')
    } else if (temp <= 75) {
      wear.push('Light layers')
    } else {
      wear.push('Light, breathable clothing')
    }

    // What to bring
    const bring = []

    // Precipitation
    const isRaining = [51, 53, 55, 56, 57, 61, 63, 65, 80, 81, 82].includes(weatherCode)
    const isSnowing = [71, 73, 75, 77, 85, 86].includes(weatherCode)
    const isStormy = [95, 96, 99].includes(weatherCode)

    if (isRaining || precipProb >= 50) {
      bring.push('Umbrella')
    }
    if (isSnowing || snowfall > 0) {
      bring.push('Waterproof boots')
    }
    if (uvIndex >= 6) {
      bring.push('Sunscreen')
    }
    if (uvIndex >= 3) {
      bring.push('Sunglasses')
    }
    if (temp >= 80) {
      bring.push('Water bottle')
    }

    // Conditions to watch
    const warnings = []

    if (feelsLike <= 0) {
      warnings.push(`Feels like ${feelsLike}°F with wind chill - frostbite risk`)
    } else if (feelsLike !== temp && Math.abs(feelsLike - temp) >= 5) {
      warnings.push(`Feels like ${feelsLike}°F`)
    }

    if (snowfall >= 6) {
      warnings.push(`${snowfall.toFixed(1)}" snow expected - travel may be hazardous`)
    } else if (snowfall >= 2) {
      warnings.push(`${snowfall.toFixed(1)}" snow expected - allow extra travel time`)
    } else if (snowfall > 0) {
      warnings.push(`Light snow: ${snowfall.toFixed(1)}" expected`)
    }

    if (isStormy) {
      warnings.push('Thunderstorms - avoid outdoor activities')
    }

    if (windSpeed >= 30) {
      warnings.push(`Strong winds: ${windSpeed} mph - secure loose items`)
    } else if (windSpeed >= 20) {
      warnings.push(`Windy: ${windSpeed} mph`)
    }

    if (visibility && visibility < 1000) {
      warnings.push('Low visibility - drive with caution')
    }

    if (aqi && aqi > 150) {
      warnings.push(`Poor air quality (AQI ${aqi}) - limit time outdoors`)
    } else if (aqi && aqi > 100) {
      warnings.push(`Moderate air quality (AQI ${aqi}) - sensitive groups take care`)
    }

    if (uvIndex >= 8) {
      warnings.push(`Very high UV (${Math.round(uvIndex)}) - limit sun exposure`)
    } else if (uvIndex >= 6) {
      warnings.push(`High UV (${Math.round(uvIndex)}) - seek shade midday`)
    }

    // Build headline - friendly and conversational
    let headline = ''
    if (isStormy) {
      headline = "Looks like storms are heading our way - maybe a good day for indoor plans!"
    } else if (snowfall >= 4) {
      headline = "Snow day vibes! We're expecting a good amount - plan accordingly."
    } else if (feelsLike <= 10) {
      headline = "Brrr, it's bitter cold out there! Keep warm and limit your time outside."
    } else if (feelsLike <= 32) {
      headline = "It's chilly! You'll want your warm layers before heading out."
    } else if (temp >= 95) {
      headline = "It's going to be a hot one! Stay cool and drink plenty of water."
    } else if (isRaining) {
      headline = "Rainy day ahead - don't forget your umbrella!"
    } else if (precipProb >= 70) {
      headline = "Rain's likely later, so you might want to pack an umbrella just in case."
    } else if (temp >= 70 && temp <= 80 && precipProb < 30 && uvIndex < 8) {
      headline = "Beautiful day ahead! Perfect weather to get outside and enjoy."
    } else {
      headline = `Looking at ${todayHigh}° today with a low of ${todayLow}° tonight.`
    }

    return { headline, wear, bring, warnings, temp, todayHigh, todayLow }
  }, [modelData, dailyForecast, airQuality])

  if (!brief) return null

  return (
    <Card className="mb-6 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 border-slate-200 dark:border-slate-700">
      <div className="space-y-3">
        {/* Headline */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{brief.headline}</h2>
          <div className="text-right">
            <span className="text-2xl font-light text-slate-800 dark:text-white">{brief.temp}°</span>
            <span className="text-sm text-slate-500 ml-2">H:{brief.todayHigh}° L:{brief.todayLow}°</span>
          </div>
        </div>

        {/* What to wear/bring - friendly suggestions */}
        <div className="text-sm text-slate-700 dark:text-slate-200 space-y-1">
          {brief.wear.length > 0 && (
            <p>You'll want to grab your <span className="font-medium">{brief.wear.join(', ').toLowerCase()}</span>.</p>
          )}
          {brief.bring.length > 0 && (
            <p>Don't forget: <span className="font-medium">{brief.bring.join(', ').toLowerCase()}</span>.</p>
          )}
        </div>

        {/* Warnings */}
        {brief.warnings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {brief.warnings.slice(0, 3).map((warning, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                {warning}
              </span>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// 10-Day Forecast Strip - Full Width with Large Icons
function TenDayStrip({ dailyForecast }) {
  const daily = dailyForecast.daily

  return (
    <Card className="mb-6 p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-blue-100 dark:border-slate-700">
        <h3 className="text-slate-800 dark:text-slate-200 font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          10-Day Forecast
        </h3>
      </div>
      <div className="overflow-x-auto">
        <div className="flex sm:grid sm:grid-cols-10" style={{ minWidth: 'max-content' }}>
          {daily.time.slice(0, 10).map((dateStr, i) => {
            const date = new Date(dateStr + 'T00:00:00') // Parse as local time to avoid timezone shift
            const weatherCode = daily.weather_code[i]
            const Icon = getWeatherIconFromCode(weatherCode)
            const isSnowy = [71, 73, 75, 77, 85, 86].includes(weatherCode)
            const snowfall = daily.snowfall_sum[i] / 2.54
            const dayName = i === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })
            const dayNum = date.getDate()

            return (
              <div
                key={i}
                className={`flex flex-col items-center py-5 px-4 sm:px-2 border-r border-blue-50 dark:border-slate-700/30 last:border-r-0 min-w-[72px] transition-colors hover:bg-blue-50 dark:hover:bg-slate-700/50 ${
                  snowfall > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${i === 0 ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
              >
                <div className="text-sm text-slate-500 dark:text-slate-400 font-semibold">{dayName}</div>
                <div className="text-xl text-slate-700 dark:text-slate-300 font-bold">{dayNum}</div>
                <Icon className={`w-10 h-10 sm:w-12 sm:h-12 my-2 sm:my-3 ${isSnowy ? 'text-blue-400' : 'text-amber-400'}`} />
                <div className="text-lg sm:text-xl text-slate-800 dark:text-white font-bold">{Math.round(daily.temperature_2m_max[i])}°</div>
                <div className="text-slate-400 dark:text-slate-500">{Math.round(daily.temperature_2m_min[i])}°</div>
                {snowfall > 0 && (
                  <div className="text-sm text-blue-500 dark:text-blue-400 mt-1 font-semibold">{snowfall.toFixed(1)}"</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// Forecast Calendar View - Shows all forecast days
function CalendarMonth({ dailyForecast }) {
  const daily = dailyForecast.daily
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Create forecast data array with dates
  const forecastDays = useMemo(() => {
    return daily.time.map((dateStr, i) => {
      const date = new Date(dateStr + 'T00:00:00')
      return {
        date,
        dateStr,
        dayOfWeek: date.getDay(),
        dayNum: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        isToday: date.getTime() === today.getTime(),
        weatherCode: daily.weather_code[i],
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        snow: daily.snowfall_sum[i] / 2.54,
      }
    })
  }, [daily, today])

  // Build weeks grid starting from today
  const weeks = useMemo(() => {
    if (forecastDays.length === 0) return []

    const result = []
    let currentWeek = []

    // Add empty cells before first day
    const firstDayOfWeek = forecastDays[0].dayOfWeek
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null)
    }

    // Add all forecast days
    forecastDays.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    })

    // Fill remaining days of last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null)
      }
      result.push(currentWeek)
    }

    return result
  }, [forecastDays])

  const forecastRange = forecastDays.length > 0
    ? `${forecastDays[0].month} ${forecastDays[0].dayNum} - ${forecastDays[forecastDays.length - 1].month} ${forecastDays[forecastDays.length - 1].dayNum}`
    : ''

  return (
    <Card className="mb-6">
      <h3 className="text-slate-800 dark:text-slate-200 font-bold mb-1 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-blue-500" />
        Forecast Calendar
      </h3>
      <p className="text-sm text-slate-500 mb-4">{forecastRange}</p>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center text-xs text-slate-400 font-semibold py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 gap-1">
            {week.map((cell, dayIdx) => {
              if (!cell) {
                return <div key={dayIdx} className="aspect-square" />
              }

              const Icon = getWeatherIconFromCode(cell.weatherCode)
              const isSnowy = [71, 73, 75, 77, 85, 86].includes(cell.weatherCode)

              return (
                <div
                  key={dayIdx}
                  className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center text-center transition-colors hover:bg-blue-50 dark:hover:bg-slate-700 ${
                    cell.isToday ? 'bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-none' : ''
                  } ${cell.snow > 0 && !cell.isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                >
                  <div className={`text-[10px] font-medium ${cell.isToday ? 'text-blue-200' : 'text-slate-400'}`}>
                    {cell.month}
                  </div>
                  <div className={`text-sm font-bold ${cell.isToday ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                    {cell.dayNum}
                  </div>
                  <Icon className={`w-4 h-4 ${cell.isToday ? 'text-white' : isSnowy ? 'text-blue-400' : 'text-amber-400'}`} />
                  <div className="text-[10px] font-semibold">
                    <span className={cell.isToday ? 'text-white' : 'text-slate-700 dark:text-white'}>{cell.high}°</span>
                    <span className={cell.isToday ? 'text-blue-200' : 'text-slate-400'}>/{cell.low}°</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Card>
  )
}

function ForecastTab({ forecast, dailyForecast, location, modelData, airQuality }) {
  if (!dailyForecast) return <LoadingSpinner />

  const daily = dailyForecast.daily

  return (
    <div className="space-y-6">
      {/* Conditions Card */}
      <ConditionsCard modelData={modelData} dailyForecast={dailyForecast} airQuality={airQuality} />

      {/* Snow Summary */}
      {daily.snowfall_sum.some(s => s > 0) && (
        <Card className="border-sky-400 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/5">
          <h3 className="text-sky-600 dark:text-sky-200 font-medium mb-2 flex items-center gap-2">
            <Snowflake className="w-5 h-5" />
            Snow Forecast
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {daily.time.map((dateStr, i) => {
              const snowCm = daily.snowfall_sum[i]
              if (snowCm === 0) return null
              const date = new Date(dateStr + 'T00:00:00') // Parse as local time
              const snow = snowCm / 2.54 // Convert cm to inches
              const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
                date.toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={i} className="text-center">
                  <div className="text-slate-500 dark:text-slate-400 text-sm">{dayName}</div>
                  <div className="text-2xl font-light text-sky-600 dark:text-sky-200">{snow.toFixed(1)}"</div>
                </div>
              )
            }).filter(Boolean)}
            <div className="text-center">
              <div className="text-slate-500 dark:text-slate-400 text-sm">10-Day Total</div>
              <div className="text-2xl font-light text-sky-600 dark:text-sky-200">
                {(daily.snowfall_sum.reduce((a, b) => a + b, 0) / 2.54).toFixed(1)}"
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function HourlyTab({ forecast }) {
  if (!forecast) return <LoadingSpinner />

  const periods = forecast.properties?.periods?.slice(0, 24) || []

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-3 pb-2" style={{ minWidth: 'max-content' }}>
        {periods.map((period, i) => {
          const Icon = getWeatherIcon(period.shortForecast)
          const time = new Date(period.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            hour12: true,
          })
          return (
            <Card key={i} className="w-24 shrink-0 text-center">
              <div className="text-sm text-slate-400 mb-2">{time}</div>
              <Icon className={`w-8 h-8 mx-auto mb-2 ${period.isDaytime ? 'text-amber-400' : 'text-slate-400'}`} />
              <div className="text-xl font-light text-white">{period.temperature}°</div>
              <div className="text-xs text-slate-500 mt-1">{period.windSpeed}</div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function ModelsTab({ modelData, location }) {
  const [extendedData, setExtendedData] = useState(null)
  const [activeModel, setActiveModel] = useState('gfs')
  const [timeRange, setTimeRange] = useState(48)

  // Fetch extended model data from multiple models
  useEffect(() => {
    const fetchExtended = async () => {
      try {
        // Fetch GFS and Canadian GEM models in parallel
        const [gfsRes, gemRes] = await Promise.all([
          fetch(
            `https://api.open-meteo.com/v1/gfs?latitude=${location.lat}&longitude=${location.lon}` +
              `&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,` +
              `freezing_level_height,snow_depth,wind_speed_10m,wind_gusts_10m,cape,lifted_index,` +
              `convective_inhibition,visibility` +
              `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,snowfall_sum,` +
              `precipitation_probability_max` +
              `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
              `&timezone=America/New_York&forecast_days=16`
          ),
          fetch(
            `https://api.open-meteo.com/v1/gem?latitude=${location.lat}&longitude=${location.lon}` +
              `&hourly=snowfall` +
              `&daily=snowfall_sum` +
              `&timezone=America/New_York&forecast_days=16`
          )
        ])

        if (gfsRes.ok) {
          const gfsData = await gfsRes.json()
          // If Canadian GEM has higher snow, use those values
          if (gemRes.ok) {
            const gemData = await gemRes.json()
            // Take the max snow from either model for each time period
            if (gemData.hourly?.snowfall && gfsData.hourly?.snowfall) {
              gfsData.hourly.snowfall = gfsData.hourly.snowfall.map((gfs, i) =>
                Math.max(gfs, gemData.hourly.snowfall[i] || 0)
              )
            }
            if (gemData.daily?.snowfall_sum && gfsData.daily?.snowfall_sum) {
              gfsData.daily.snowfall_sum = gfsData.daily.snowfall_sum.map((gfs, i) =>
                Math.max(gfs, gemData.daily.snowfall_sum[i] || 0)
              )
            }
          }
          setExtendedData(gfsData)
        }
      } catch (err) {
        console.error('Failed to fetch extended model data:', err)
      }
    }
    fetchExtended()
  }, [location.lat, location.lon])

  if (!modelData) return <LoadingSpinner />

  const hourly = modelData.hourly
  const extended = extendedData?.hourly || hourly
  const daily = extendedData?.daily

  const tempData = extended.temperature_2m?.slice(0, timeRange) || []
  const precipProb = extended.precipitation_probability?.slice(0, timeRange) || []
  // Convert snowfall from cm to inches
  const snowfallCm = extended.snowfall?.slice(0, timeRange) || []
  const snowfall = snowfallCm.map(s => s / 2.54)
  const windSpeed = extended.wind_speed_10m?.slice(0, timeRange) || []
  const windGusts = extended.wind_gusts_10m?.slice(0, timeRange) || []
  const cape = extended.cape?.slice(0, timeRange) || []
  const liftedIndex = extended.lifted_index?.slice(0, timeRange) || []
  const times = extended.time?.slice(0, timeRange) || []

  const maxTemp = Math.max(...tempData)
  const minTemp = Math.min(...tempData)
  const maxPrecip = Math.max(...precipProb, 100)
  const maxSnow = Math.max(...snowfall, 0.2) // Min for chart scaling (inches)
  const maxWind = Math.max(...windSpeed, ...windGusts, 30)
  const maxCape = Math.max(...cape, 1000)

  const totalSnow = snowfall.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <Card className="flex flex-wrap items-center gap-4">
        <span className="text-slate-400 text-sm">Time Range:</span>
        {[24, 48, 72, 120, 168].map((hours) => (
          <button
            key={hours}
            onClick={() => setTimeRange(hours)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              timeRange === hours
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 bg-slate-800/50 border border-slate-700/50'
            }`}
          >
            {hours}h {hours >= 168 ? '(7d)' : hours >= 120 ? '(5d)' : hours >= 72 ? '(3d)' : ''}
          </button>
        ))}
      </Card>

      {/* Snow Accumulation - Highlighted if any snow */}
      {totalSnow > 0 && (
        <Card className="border-sky-500/30 bg-sky-500/5">
          <h3 className="text-sky-200 font-medium mb-4 flex items-center gap-2">
            <Snowflake className="w-5 h-5" />
            Hourly Snow Accumulation ({timeRange}h)
          </h3>
          <div className="h-32 flex items-end gap-[1px]">
            {snowfall.map((snow, i) => {
              const height = (snow / maxSnow) * 100
              return (
                <div
                  key={i}
                  className="flex-1 bg-gradient-to-t from-sky-400 to-white rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  style={{ height: `${Math.max(height, snow > 0 ? 5 : 0)}%` }}
                  title={`${new Date(times[i]).toLocaleString()}: ${snow.toFixed(2)}" snow`}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Now</span>
            <span>+{Math.round(timeRange / 2)}h</span>
            <span>+{timeRange}h</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total Accumulation:</span>
            <span className="text-2xl font-light text-sky-200">{totalSnow.toFixed(1)}"</span>
          </div>
        </Card>
      )}

      {/* Temperature */}
      <Card>
        <h3 className="text-slate-200 font-medium mb-4 flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-rose-400" />
          Temperature ({timeRange}h)
        </h3>
        <div className="h-32 flex items-end gap-[1px]">
          {tempData.map((temp, i) => {
            const height = ((temp - minTemp) / (maxTemp - minTemp || 1)) * 100
            const isFreezing = temp <= 32
            return (
              <div
                key={i}
                className={`flex-1 rounded-t opacity-80 hover:opacity-100 transition-opacity cursor-pointer ${
                  isFreezing ? 'bg-sky-400' : 'bg-gradient-to-t from-sky-500 to-rose-500'
                }`}
                style={{ height: `${Math.max(height, 5)}%` }}
                title={`${new Date(times[i]).toLocaleString()}: ${Math.round(temp)}°F`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Now</span>
          <span>+{Math.round(timeRange / 2)}h</span>
          <span>+{timeRange}h</span>
        </div>
        <div className="flex justify-between text-sm text-slate-300 mt-1">
          <span>Low: {Math.round(minTemp)}°F</span>
          <span>High: {Math.round(maxTemp)}°F</span>
        </div>
      </Card>

      {/* Precipitation Probability */}
      <Card>
        <h3 className="text-slate-200 font-medium mb-4 flex items-center gap-2">
          <CloudRain className="w-5 h-5 text-sky-400" />
          Precipitation Probability ({timeRange}h)
        </h3>
        <div className="h-24 flex items-end gap-[1px]">
          {precipProb.map((prob, i) => {
            const height = (prob / maxPrecip) * 100
            return (
              <div
                key={i}
                className="flex-1 bg-sky-500 rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${new Date(times[i]).toLocaleString()}: ${prob}%`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Now</span>
          <span>+{Math.round(timeRange / 2)}h</span>
          <span>+{timeRange}h</span>
        </div>
      </Card>

      {/* Wind Speed & Gusts */}
      <Card>
        <h3 className="text-slate-200 font-medium mb-4 flex items-center gap-2">
          <Wind className="w-5 h-5 text-emerald-400" />
          Wind Speed & Gusts ({timeRange}h)
        </h3>
        <div className="h-24 flex items-end gap-[1px] relative">
          {windSpeed.map((speed, i) => {
            const gustHeight = ((windGusts[i] || speed) / maxWind) * 100
            const speedHeight = (speed / maxWind) * 100
            return (
              <div key={i} className="flex-1 relative cursor-pointer" title={`${new Date(times[i]).toLocaleString()}: ${Math.round(speed)} mph (gusts ${Math.round(windGusts[i] || speed)} mph)`}>
                <div
                  className="absolute bottom-0 w-full bg-emerald-800/50 rounded-t"
                  style={{ height: `${gustHeight}%` }}
                />
                <div
                  className="absolute bottom-0 w-full bg-emerald-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                  style={{ height: `${speedHeight}%` }}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Now</span>
          <span>+{Math.round(timeRange / 2)}h</span>
          <span>+{timeRange}h</span>
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded"></span> Sustained</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-800/50 rounded"></span> Gusts</span>
        </div>
      </Card>

      {/* CAPE & Lifted Index (Severe Weather) */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-slate-200 font-medium mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            CAPE (Instability)
          </h3>
          <div className="h-20 flex items-end gap-[1px]">
            {cape.map((c, i) => {
              const height = (c / maxCape) * 100
              const isHighCape = c > 1000
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-pointer ${
                    isHighCape ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${new Date(times[i]).toLocaleString()}: ${Math.round(c)} J/kg`}
                />
              )
            })}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Max: {Math.round(Math.max(...cape))} J/kg
            {Math.max(...cape) > 1000 && <span className="text-amber-400 ml-2">⚠️ Elevated</span>}
          </div>
        </Card>

        <Card>
          <h3 className="text-slate-200 font-medium mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            Lifted Index
          </h3>
          <div className="h-20 flex items-end gap-[1px]">
            {liftedIndex.map((li, i) => {
              // Lifted index: negative = unstable, positive = stable
              const normalized = Math.max(0, 10 - li) / 20 * 100
              const isUnstable = li < 0
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-t opacity-70 hover:opacity-100 transition-opacity cursor-pointer ${
                    isUnstable ? 'bg-red-500' : 'bg-purple-500'
                  }`}
                  style={{ height: `${Math.max(normalized, 5)}%` }}
                  title={`${new Date(times[i]).toLocaleString()}: ${li?.toFixed(1) || 'N/A'}`}
                />
              )
            })}
          </div>
          <div className="text-xs text-slate-500 mt-2">
            Min: {Math.min(...liftedIndex.filter(l => l !== null))?.toFixed(1) || 'N/A'}
            {Math.min(...liftedIndex.filter(l => l !== null)) < -2 && <span className="text-red-400 ml-2">⚠️ Unstable</span>}
          </div>
        </Card>
      </div>

      {/* Extended Daily Forecast Summary */}
      {daily && (
        <Card>
          <h3 className="text-slate-200 font-medium mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            16-Day Model Summary (GFS)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs">
                  <th className="text-left py-2 pr-4">Day</th>
                  <th className="text-right py-2 px-2">High</th>
                  <th className="text-right py-2 px-2">Low</th>
                  <th className="text-right py-2 px-2">Precip %</th>
                  <th className="text-right py-2 px-2">Rain</th>
                  <th className="text-right py-2 pl-2">Snow</th>
                </tr>
              </thead>
              <tbody>
                {daily.time.map((dateStr, i) => {
                  const date = new Date(dateStr + 'T00:00:00') // Parse as local time
                  const snowCm = daily.snowfall_sum[i]
                  const snow = snowCm / 2.54 // Convert cm to inches
                  const precip = daily.precipitation_sum[i]
                  return (
                    <tr key={i} className={`border-t border-slate-700/50 ${snow > 0.05 ? 'bg-sky-500/5' : ''}`}>
                      <td className="py-2 pr-4 text-slate-300">
                        {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="text-right py-2 px-2 text-rose-400">{Math.round(daily.temperature_2m_max[i])}°</td>
                      <td className="text-right py-2 px-2 text-sky-400">{Math.round(daily.temperature_2m_min[i])}°</td>
                      <td className="text-right py-2 px-2 text-slate-300">{daily.precipitation_probability_max[i]}%</td>
                      <td className="text-right py-2 px-2 text-slate-300">{precip > 0 ? `${precip.toFixed(2)}"` : '-'}</td>
                      <td className="text-right py-2 pl-2">
                        {snow > 0.05 ? (
                          <span className="text-sky-300 font-medium">{snow.toFixed(1)}"</span>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Model Info */}
      <Card>
        <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400" />
          Model Information
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-500">Primary Model</div>
            <div className="text-slate-200">GFS (NOAA)</div>
          </div>
          <div>
            <div className="text-slate-500">Snow Model</div>
            <div className="text-slate-200">GFS + Canadian GEM</div>
          </div>
          <div>
            <div className="text-slate-500">Run Frequency</div>
            <div className="text-slate-200">Every 6 hours</div>
          </div>
          <div>
            <div className="text-slate-500">Forecast Range</div>
            <div className="text-slate-200">16 days</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-700/50 text-xs text-slate-500">
          Data via Open-Meteo API. Snow forecasts use the higher of GFS (NOAA) or Canadian GEM model predictions.
          GFS updates at 00Z, 06Z, 12Z, 18Z UTC. Hourly resolution days 1-5, 3-hourly days 6-16.
        </div>
      </Card>
    </div>
  )
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  return null
}

// Alert severity styling
const getAlertStyle = (feature) => {
  const event = feature.properties?.event?.toLowerCase() || ''
  const severity = feature.properties?.severity?.toLowerCase() || ''

  // Warnings - Red
  if (event.includes('warning') || severity === 'extreme' || severity === 'severe') {
    return { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }
  }
  // Watches - Orange
  if (event.includes('watch')) {
    return { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.25, weight: 2 }
  }
  // Advisories - Yellow
  if (event.includes('advisory') || severity === 'moderate') {
    return { color: '#eab308', fillColor: '#eab308', fillOpacity: 0.2, weight: 2 }
  }
  // Statements/Other - Blue
  return { color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }
}

function RadarTab({ location, onGeolocate, locating }) {
  const [radarFrames, setRadarFrames] = useState([])
  const [satelliteFrames, setSatelliteFrames] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showRadar, setShowRadar] = useState(true)
  const [showSatellite, setShowSatellite] = useState(false)
  const [showAlerts, setShowAlerts] = useState(true)
  const [alertsGeoJson, setAlertsGeoJson] = useState(null)
  const [radarOpacity, setRadarOpacity] = useState(0.7)
  const [satelliteOpacity, setSatelliteOpacity] = useState(0.6)
  const isDark = useColorScheme()

  const center = useMemo(() => [location.lat, location.lon], [location.lat, location.lon])

  // Fetch RainViewer radar and satellite frames with caching for 4-hour history
  useEffect(() => {
    const CACHE_KEY = 'radar_frame_cache_full'
    const MAX_AGE_HOURS = 4
    const MAX_AGE_SECONDS = MAX_AGE_HOURS * 60 * 60

    const fetchFrames = async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        const data = await res.json()
        const newFrames = data.radar.past.concat(data.radar.nowcast || [])

        // Load cached frames from localStorage
        let cachedFrames = []
        try {
          const cached = localStorage.getItem(CACHE_KEY)
          if (cached) cachedFrames = JSON.parse(cached)
        } catch (e) {}

        // Merge cached and new frames, removing duplicates by timestamp
        const frameMap = new Map()
        const now = Math.floor(Date.now() / 1000)
        const cutoff = now - MAX_AGE_SECONDS

        // Add cached frames (filter old ones)
        cachedFrames.forEach(f => {
          if (f.time >= cutoff) frameMap.set(f.time, f)
        })

        // Add new frames (overwrites duplicates)
        newFrames.forEach(f => frameMap.set(f.time, f))

        // Sort by time and convert back to array
        const allFrames = Array.from(frameMap.values()).sort((a, b) => a.time - b.time)

        // Cache the merged frames (only past, not nowcast)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(allFrames.filter(f => f.time <= now)))
        } catch (e) {}

        setRadarFrames(allFrames)
        if (data.satellite && data.satellite.infrared) {
          setSatelliteFrames(data.satellite.infrared)
        }
        setCurrentFrame(0) // Start from oldest
      } catch (err) {
        console.error('Failed to fetch weather frames:', err)
      }
    }
    fetchFrames()
    const interval = setInterval(fetchFrames, 5 * 60 * 1000) // Refresh every 5 min
    return () => clearInterval(interval)
  }, [])

  // Fetch NWS alerts with geometry
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Fetch alerts for a wider area around the location
        const res = await fetch(
          `https://api.weather.gov/alerts/active?point=${location.lat},${location.lon}&limit=50`,
          { headers: { 'User-Agent': 'WeatherDashboard/1.0' } }
        )
        if (res.ok) {
          const data = await res.json()
          // Filter to only features with geometry
          const featuresWithGeometry = data.features?.filter(f => f.geometry) || []
          if (featuresWithGeometry.length > 0) {
            setAlertsGeoJson({ type: 'FeatureCollection', features: featuresWithGeometry })
          } else {
            // If no point-based alerts, try state-wide
            const stateRes = await fetch(
              `https://api.weather.gov/alerts/active?area=${location.state}`,
              { headers: { 'User-Agent': 'WeatherDashboard/1.0' } }
            )
            if (stateRes.ok) {
              const stateData = await stateRes.json()
              const stateFeatures = stateData.features?.filter(f => f.geometry) || []
              setAlertsGeoJson({ type: 'FeatureCollection', features: stateFeatures })
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err)
      }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 2 * 60 * 1000) // Refresh every 2 min
    return () => clearInterval(interval)
  }, [location.lat, location.lon, location.state])

  // Animation playback (slower for better viewing)
  useEffect(() => {
    if (!isPlaying || radarFrames.length === 0) return
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % radarFrames.length)
    }, 1500) // Slower animation
    return () => clearInterval(interval)
  }, [isPlaying, radarFrames.length])

  const currentRadarUrl = radarFrames[currentFrame]
    ? `https://tilecache.rainviewer.com${radarFrames[currentFrame].path}/256/{z}/{x}/{y}/4/1_1.png`
    : null

  // Find closest satellite frame to current radar frame time
  const currentSatelliteUrl = useMemo(() => {
    if (!satelliteFrames.length || !radarFrames[currentFrame]) return null
    const targetTime = radarFrames[currentFrame].time
    const closest = satelliteFrames.reduce((prev, curr) =>
      Math.abs(curr.time - targetTime) < Math.abs(prev.time - targetTime) ? curr : prev
    )
    return `https://tilecache.rainviewer.com${closest.path}/256/{z}/{x}/{y}/0/0_0.png`
  }, [satelliteFrames, radarFrames, currentFrame])

  const frameTime = radarFrames[currentFrame]
    ? new Date(radarFrames[currentFrame].time * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : ''

  return (
    <div className="space-y-4">
      {/* Layer Controls */}
      <Card className="flex flex-wrap items-center gap-4">
        {/* My Location Button */}
        <button
          onClick={onGeolocate}
          disabled={locating}
          className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/20 border border-sky-500/30 rounded-lg hover:bg-sky-500/30 transition-colors disabled:opacity-50"
        >
          <Navigation className={`w-4 h-4 text-sky-400 ${locating ? 'animate-pulse' : ''}`} />
          <span className="text-sm text-sky-300">{locating ? 'Locating...' : 'My Location'}</span>
        </button>

        <div className="w-px h-6 bg-slate-700" />

        {/* Layer toggles */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRadar}
              onChange={(e) => setShowRadar(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded"
            />
            <span className="text-sm text-slate-300">Radar</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSatellite}
              onChange={(e) => setShowSatellite(e.target.checked)}
              className="w-4 h-4 accent-sky-500 rounded"
            />
            <span className="text-sm text-slate-300">Satellite (IR)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAlerts}
              onChange={(e) => setShowAlerts(e.target.checked)}
              className="w-4 h-4 accent-rose-500 rounded"
            />
            <span className="text-sm text-slate-300">Alerts</span>
            {alertsGeoJson?.features?.length > 0 && (
              <span className="text-xs bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded">
                {alertsGeoJson.features.length}
              </span>
            )}
          </label>
        </div>
        {/* Opacity controls */}
        <div className="flex items-center gap-4 ml-auto">
          {showRadar && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Radar</span>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={radarOpacity}
                onChange={(e) => setRadarOpacity(parseFloat(e.target.value))}
                className="w-16 accent-sky-500"
              />
            </div>
          )}
          {showSatellite && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Satellite</span>
              <input
                type="range"
                min="0.3"
                max="1"
                step="0.1"
                value={satelliteOpacity}
                onChange={(e) => setSatelliteOpacity(parseFloat(e.target.value))}
                className="w-16 accent-sky-500"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Map */}
      <Card className="p-0 overflow-hidden">
        <div className="h-[375px] relative">
          <MapContainer
            center={center}
            zoom={8}
            className="h-full w-full"
            style={{ background: isDark ? '#1e293b' : '#f1f5f9' }}
            zoomControl={false}
            attributionControl={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <MapUpdater center={center} />
            <TileLayer
              url={isDark ? MAP_TILES.dark : MAP_TILES.light}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {showSatellite && currentSatelliteUrl && (
              <TileLayer
                url={currentSatelliteUrl}
                opacity={satelliteOpacity}
                zIndex={50}
              />
            )}
            {showRadar && currentRadarUrl && (
              <TileLayer
                url={currentRadarUrl}
                opacity={radarOpacity}
                zIndex={100}
              />
            )}
            {showAlerts && alertsGeoJson && (
              <GeoJSON
                key={JSON.stringify(alertsGeoJson)}
                data={alertsGeoJson}
                style={getAlertStyle}
                onEachFeature={(feature, layer) => {
                  const props = feature.properties
                  layer.bindPopup(`
                    <div style="max-width: 300px;">
                      <strong style="color: #ef4444;">${props.event || 'Alert'}</strong>
                      <p style="margin: 8px 0 4px; font-size: 12px; color: #666;">
                        ${props.headline || ''}
                      </p>
                      <p style="font-size: 11px; color: #888;">
                        ${props.areaDesc || ''}
                      </p>
                      <p style="font-size: 11px; color: #888; margin-top: 4px;">
                        Expires: ${props.expires ? new Date(props.expires).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                  `)
                }}
              />
            )}
          </MapContainer>
          {/* Time indicator */}
          <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm text-slate-200 z-[1000]">
            {frameTime}
          </div>
          {/* Alert Legend */}
          {showAlerts && alertsGeoJson?.features?.length > 0 && (
            <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm px-3 py-2 rounded-lg text-xs z-[1000]">
              <div className="text-slate-400 mb-1.5 font-medium">Alerts</div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-red-500/70 border border-red-500"></div>
                  <span className="text-slate-300">Warning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-orange-500/70 border border-orange-500"></div>
                  <span className="text-slate-300">Watch</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-yellow-500/70 border border-yellow-500"></div>
                  <span className="text-slate-300">Advisory</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Playback Controls */}
      <Card className="flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrentFrame((prev) => Math.max(0, prev - 1))}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          disabled={currentFrame === 0}
        >
          <SkipBack className="w-5 h-5 text-slate-300" />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-3 rounded-full bg-sky-500/20 hover:bg-sky-500/30 transition-colors border border-sky-500/30"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 text-sky-400" />
          ) : (
            <Play className="w-6 h-6 text-sky-400" />
          )}
        </button>
        <button
          onClick={() => setCurrentFrame((prev) => Math.min(radarFrames.length - 1, prev + 1))}
          className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 transition-colors"
          disabled={currentFrame === radarFrames.length - 1}
        >
          <SkipForward className="w-5 h-5 text-slate-300" />
        </button>
        <div className="ml-4 text-sm text-slate-400">
          Frame {currentFrame + 1} / {radarFrames.length}
        </div>
      </Card>

      {/* Timeline Scrubber */}
      <Card>
        <input
          type="range"
          min="0"
          max={radarFrames.length - 1}
          value={currentFrame}
          onChange={(e) => {
            setCurrentFrame(parseInt(e.target.value))
            setIsPlaying(false)
          }}
          className="w-full accent-sky-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>Past</span>
          <span>Now</span>
          <span>Forecast</span>
        </div>
      </Card>
    </div>
  )
}

// API Status indicator component
function ApiStatusDot({ status }) {
  const colors = {
    online: 'bg-emerald-500',
    offline: 'bg-red-500',
    loading: 'bg-yellow-500 animate-pulse',
    unknown: 'bg-slate-400'
  }
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.unknown}`} />
  )
}

// Live Data Sources Page component
function DataSourcesPage({ location, modelData, dailyForecast, airQuality, alerts }) {
  const isDark = useColorScheme()
  const [isExpanded, setIsExpanded] = useState(false)
  const [apiStatuses, setApiStatuses] = useState({})
  const [radarPreview, setRadarPreview] = useState(null)
  const [gemData, setGemData] = useState(null)
  const [loadingGem, setLoadingGem] = useState(false)
  const [showSatelliteLoop, setShowSatelliteLoop] = useState(false)

  // Check API statuses on mount
  useEffect(() => {
    const checkApis = async () => {
      const statuses = {}

      // Check Open-Meteo GFS
      try {
        const res = await fetch('https://api.open-meteo.com/v1/gfs?latitude=40&longitude=-80&current=temperature_2m', { method: 'HEAD' })
        statuses['open-meteo-gfs'] = res.ok ? 'online' : 'offline'
      } catch { statuses['open-meteo-gfs'] = 'offline' }

      // Check Open-Meteo GEM
      try {
        const res = await fetch('https://api.open-meteo.com/v1/gem?latitude=40&longitude=-80&current=temperature_2m', { method: 'HEAD' })
        statuses['open-meteo-gem'] = res.ok ? 'online' : 'offline'
      } catch { statuses['open-meteo-gem'] = 'offline' }

      // Check NWS API
      try {
        const res = await fetch('https://api.weather.gov/points/40,-80', { headers: { 'User-Agent': 'WeatherDashboard/1.0' } })
        statuses['nws'] = res.ok ? 'online' : 'offline'
      } catch { statuses['nws'] = 'offline' }

      // Check RainViewer
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        statuses['rainviewer'] = res.ok ? 'online' : 'offline'
      } catch { statuses['rainviewer'] = 'offline' }

      // Check Air Quality API
      try {
        const res = await fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=40&longitude=-80&current=us_aqi', { method: 'HEAD' })
        statuses['air-quality'] = res.ok ? 'online' : 'offline'
      } catch { statuses['air-quality'] = 'offline' }

      setApiStatuses(statuses)
    }

    checkApis()
    const interval = setInterval(checkApis, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [])

  // Fetch radar preview
  useEffect(() => {
    const fetchRadar = async () => {
      try {
        const res = await fetch('https://api.rainviewer.com/public/weather-maps.json')
        const data = await res.json()
        const latestFrame = data.radar.past[data.radar.past.length - 1]
        if (latestFrame) {
          setRadarPreview({
            path: latestFrame.path,
            time: new Date(latestFrame.time * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          })
        }
      } catch (err) {
        console.error('Failed to fetch radar preview:', err)
      }
    }
    fetchRadar()
  }, [])

  // Fetch GEM model data for comparison when expanded
  useEffect(() => {
    if (!isExpanded || gemData || loadingGem) return

    const fetchGem = async () => {
      setLoadingGem(true)
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/gem?latitude=${location.lat}&longitude=${location.lon}` +
          `&hourly=temperature_2m&temperature_unit=fahrenheit&timezone=America/New_York&forecast_days=3`
        )
        const data = await res.json()
        setGemData(data)
      } catch (err) {
        console.error('Failed to fetch GEM data:', err)
      }
      setLoadingGem(false)
    }
    fetchGem()
  }, [isExpanded, location.lat, location.lon, gemData, loadingGem])

  // Get current AQI data
  const aqi = airQuality?.current
  const aqiValue = aqi?.us_aqi ?? 0
  const aqiLevel = getAqiLevel(aqiValue)

  // Get GOES sector based on location
  const getGoesSector = (lon) => {
    if (lon < -100) return { satellite: 'GOES18', sector: 'PSWA' } // West
    if (lon < -85) return { satellite: 'GOES16', sector: 'UMVL' } // Central
    return { satellite: 'GOES16', sector: 'NE' } // East
  }
  const goesSector = getGoesSector(location.lon)
  const goesImageUrl = `https://cdn.star.nesdis.noaa.gov/${goesSector.satellite}/ABI/SECTOR/${goesSector.sector}/GEOCOLOR/latest.jpg`

  // Count online APIs
  const onlineCount = Object.values(apiStatuses).filter(s => s === 'online').length
  const totalApis = Object.keys(apiStatuses).length

  // Model comparison data
  const gfsTemps = modelData?.hourly?.temperature_2m?.slice(0, 24) || []
  const gemTemps = gemData?.hourly?.temperature_2m?.slice(0, 24) || []

  return (
    <div className="space-y-6 mt-8">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 rounded-2xl border border-blue-200 dark:border-blue-500/30 hover:from-blue-500/20 hover:to-purple-500/20 dark:hover:from-blue-500/30 dark:hover:to-purple-500/30 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-left">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Data Sources</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {totalApis > 0 ? `${onlineCount}/${totalApis} APIs online` : 'Checking status...'}
            </p>
          </div>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
      </button>

      {isExpanded && (
        <div className="space-y-6 animate-fade-in">
          {/* Live Data Preview Cards */}
          <div>
            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Live Data Previews
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Radar Preview Card */}
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <CloudRain className="w-4 h-4 text-sky-500" />
                    Radar
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ApiStatusDot status={apiStatuses['rainviewer'] || 'loading'} />
                    <span>RainViewer</span>
                  </div>
                </div>
                {radarPreview ? (
                  <div className="relative">
                    <img
                      src={`https://tilecache.rainviewer.com${radarPreview.path}/512/4/${Math.round(location.lat / 10)}/${Math.round((location.lon + 180) / 10)}/2/1_1.png`}
                      alt="Radar preview"
                      className="w-full h-32 object-cover rounded-lg bg-slate-100 dark:bg-slate-700"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                      {radarPreview.time}
                    </div>
                  </div>
                ) : (
                  <div className="h-32 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                  </div>
                )}
                <a
                  href="https://www.rainviewer.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  View full radar <ExternalLink className="w-3 h-3" />
                </a>
              </Card>

              {/* Satellite Preview Card */}
              <Card className="overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-500" />
                    Satellite
                  </h4>
                  <span className="text-xs text-slate-500">{goesSector.satellite}</span>
                </div>
                <div className="relative">
                  <img
                    src={goesImageUrl}
                    alt="GOES satellite imagery"
                    className="w-full h-32 object-cover rounded-lg bg-slate-100 dark:bg-slate-700"
                    onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' }}
                  />
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {goesSector.sector} Sector
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <a
                    href={`https://www.star.nesdis.noaa.gov/GOES/${goesSector.satellite === 'GOES16' ? 'index' : 'GOES18_CONUS'}.php`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                  >
                    View full satellite <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setShowSatelliteLoop(!showSatelliteLoop)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                      showSatelliteLoop
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <Play className="w-3 h-3" />
                    {showSatelliteLoop ? 'Hide Loop' : 'View Loop'}
                  </button>
                </div>
              </Card>

              {/* Air Quality Card */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Wind className="w-4 h-4 text-emerald-500" />
                    Air Quality
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ApiStatusDot status={apiStatuses['air-quality'] || 'loading'} />
                    <span>Open-Meteo</span>
                  </div>
                </div>
                {aqi ? (
                  <div className="space-y-3">
                    <div className={`text-center p-3 rounded-lg ${aqiLevel.bg}`}>
                      <div className={`text-3xl font-bold ${aqiLevel.color}`}>{aqiValue}</div>
                      <div className={`text-sm ${aqiLevel.color}`}>{aqiLevel.label}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                        <div className="text-slate-500">PM2.5</div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{aqi.pm2_5?.toFixed(1) || '--'}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                        <div className="text-slate-500">PM10</div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{aqi.pm10?.toFixed(1) || '--'}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                        <div className="text-slate-500">Ozone</div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{aqi.ozone?.toFixed(1) || '--'}</div>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded">
                        <div className="text-slate-500">NO2</div>
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{aqi.nitrogen_dioxide?.toFixed(1) || '--'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center text-slate-400">
                    No AQI data available
                  </div>
                )}
              </Card>

              {/* Active Alerts Card */}
              <Card>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Active Alerts
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ApiStatusDot status={apiStatuses['nws'] || 'loading'} />
                    <span>NWS</span>
                  </div>
                </div>
                {alerts && alerts.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {alerts.slice(0, 5).map((alert, i) => (
                      <div
                        key={i}
                        className="p-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg"
                      >
                        <div className="text-sm font-medium text-amber-800 dark:text-amber-200 truncate">
                          {alert.properties?.event || 'Weather Alert'}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-300/70 truncate">
                          {alert.properties?.areaDesc}
                        </div>
                      </div>
                    ))}
                    {alerts.length > 5 && (
                      <div className="text-xs text-slate-500 text-center">
                        +{alerts.length - 5} more alerts
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mb-2">
                      <span className="text-emerald-500 text-lg">&#10003;</span>
                    </div>
                    <span className="text-sm">No active alerts</span>
                  </div>
                )}
                <a
                  href={`https://alerts.weather.gov/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  View all alerts <ExternalLink className="w-3 h-3" />
                </a>
              </Card>

              {/* Model Comparison Card */}
              <Card className="sm:col-span-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    Model Comparison (24h)
                  </h4>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-blue-500 rounded" /> GFS
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-1 bg-purple-500 rounded" /> GEM
                    </span>
                  </div>
                </div>
                {gfsTemps.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex gap-1 h-24 items-end">
                      {gfsTemps.slice(0, 24).map((temp, i) => {
                        const gemTemp = gemTemps[i]
                        const maxTemp = Math.max(...gfsTemps, ...(gemTemps.length ? gemTemps : gfsTemps))
                        const minTemp = Math.min(...gfsTemps, ...(gemTemps.length ? gemTemps : gfsTemps))
                        const range = maxTemp - minTemp || 1
                        const gfsHeight = ((temp - minTemp) / range) * 80 + 20
                        const gemHeight = gemTemp ? ((gemTemp - minTemp) / range) * 80 + 20 : 0

                        return (
                          <div key={i} className="flex-1 flex gap-px items-end" title={`Hour ${i}: GFS ${Math.round(temp)}° ${gemTemp ? `/ GEM ${Math.round(gemTemp)}°` : ''}`}>
                            <div
                              className="flex-1 bg-blue-400/60 rounded-t transition-all hover:bg-blue-500"
                              style={{ height: `${gfsHeight}%` }}
                            />
                            {gemTemp && (
                              <div
                                className="flex-1 bg-purple-400/60 rounded-t transition-all hover:bg-purple-500"
                                style={{ height: `${gemHeight}%` }}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Now</span>
                      <span>+12h</span>
                      <span>+24h</span>
                    </div>
                    {gemTemps.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                          <div className="text-slate-500">GFS High</div>
                          <div className="font-semibold text-blue-500">{Math.round(Math.max(...gfsTemps))}°</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                          <div className="text-slate-500">GEM High</div>
                          <div className="font-semibold text-purple-500">{Math.round(Math.max(...gemTemps))}°</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded text-center">
                          <div className="text-slate-500">Difference</div>
                          <div className="font-semibold text-slate-700 dark:text-slate-200">
                            {Math.abs(Math.round(Math.max(...gfsTemps)) - Math.round(Math.max(...gemTemps)))}°
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                  </div>
                )}
              </Card>
            </div>

            {/* Satellite Loop - shown when requested */}
            {showSatelliteLoop && (
              <div className="mt-4">
                <SatelliteLoop location={location} />
              </div>
            )}
          </div>

          {/* API Status Overview */}
          <Card>
            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              API Status
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { id: 'open-meteo-gfs', name: 'Open-Meteo GFS', icon: Thermometer },
                { id: 'open-meteo-gem', name: 'Open-Meteo GEM', icon: Thermometer },
                { id: 'nws', name: 'NWS API', icon: Cloud },
                { id: 'rainviewer', name: 'RainViewer', icon: CloudRain },
                { id: 'air-quality', name: 'Air Quality', icon: Wind },
              ].map(api => {
                const Icon = api.icon
                const status = apiStatuses[api.id] || 'loading'
                return (
                  <div
                    key={api.id}
                    className={`p-3 rounded-lg border ${
                      status === 'online'
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30'
                        : status === 'offline'
                        ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                        : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${
                        status === 'online' ? 'text-emerald-500' : status === 'offline' ? 'text-red-500' : 'text-slate-400'
                      }`} />
                      <ApiStatusDot status={status} />
                    </div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-200">{api.name}</div>
                    <div className={`text-xs ${
                      status === 'online' ? 'text-emerald-600 dark:text-emerald-400' :
                      status === 'offline' ? 'text-red-600 dark:text-red-400' : 'text-slate-500'
                    }`}>
                      {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'Checking...'}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Weather Resources */}
          <div>
            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-500" />
              Weather Resources
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(WEATHER_LINKS).map(([category, links]) => (
                <Card key={category}>
                  <h4 className="text-slate-700 dark:text-slate-200 font-semibold mb-3">{category}</h4>
                  <div className="space-y-1">
                    {links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <span className="text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-sky-400">{link.name}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-blue-600 dark:group-hover:text-sky-400" />
                      </a>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Raw Data Sources */}
          <div>
            <h3 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Raw Data Sources (APIs)
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(RAW_DATA_SOURCES).map(([category, sources]) => (
                <Card key={category}>
                  <h4 className="text-slate-700 dark:text-slate-200 font-semibold mb-3">{category}</h4>
                  <div className="space-y-2">
                    {sources.map((source) => (
                      <div key={source.url} className="text-sm">
                        <div className="text-slate-700 dark:text-slate-300 font-medium">{source.name}</div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-sky-400 hover:underline break-all text-xs font-mono"
                        >
                          {source.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [nwsGrid, setNwsGrid] = useState(null)
  const [forecast, setForecast] = useState(null)
  const [hourlyForecast, setHourlyForecast] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [modelData, setModelData] = useState(null)
  const [dailyForecast, setDailyForecast] = useState(null)
  const [airQuality, setAirQuality] = useState(null)
  const [locating, setLocating] = useState(false)

  const fetchWeatherData = useCallback(async (loc) => {
    setLoading(true)
    setError(null)

    try {
      // 1. Get NWS grid point
      const pointsRes = await fetch(
        `https://api.weather.gov/points/${loc.lat},${loc.lon}`,
        { headers: { 'User-Agent': 'WeatherDashboard/1.0' } }
      )
      if (!pointsRes.ok) throw new Error('Failed to get NWS grid data')
      const pointsData = await pointsRes.json()
      setNwsGrid(pointsData)

      const { gridId, gridX, gridY } = pointsData.properties
      const forecastUrl = pointsData.properties.forecast
      const hourlyUrl = pointsData.properties.forecastHourly

      // 2. Fetch forecast, hourly, alerts, and model data in parallel
      // Add cache-busting timestamp to prevent stale data
      const cacheBust = `&_t=${Date.now()}`
      const noCacheOpts = { cache: 'no-store' }
      const nwsOpts = { headers: { 'User-Agent': 'WeatherDashboard/1.0' }, cache: 'no-store' }

      const [forecastRes, hourlyRes, alertsRes, modelRes, dailyRes, gemRes, aqiRes] = await Promise.all([
        fetch(forecastUrl, nwsOpts),
        fetch(hourlyUrl, nwsOpts),
        fetch(`https://api.weather.gov/alerts/active?area=${loc.state}`, nwsOpts),
        fetch(
          `https://api.open-meteo.com/v1/gfs?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,` +
            `weather_code,surface_pressure,wind_speed_10m,wind_direction_10m` +
            `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,` +
            `precipitation,weather_code,wind_speed_10m,wind_direction_10m,cape,snowfall` +
            `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America/New_York` +
            cacheBust,
          noCacheOpts
        ),
        // Daily forecast from Open-Meteo GFS model
        fetch(
          `https://api.open-meteo.com/v1/gfs?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,` +
            `apparent_temperature_min,precipitation_sum,precipitation_probability_max,` +
            `snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,` +
            `uv_index_max,sunrise,sunset` +
            `&current=uv_index,visibility,dew_point_2m` +
            `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch` +
            `&timezone=America/New_York&forecast_days=16` +
            cacheBust,
          noCacheOpts
        ),
        // Canadian GEM model for snow comparison (often higher for Northeast US)
        fetch(
          `https://api.open-meteo.com/v1/gem?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&daily=snowfall_sum` +
            `&timezone=America/New_York&forecast_days=16` +
            cacheBust,
          noCacheOpts
        ),
        // Air quality data
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone` +
            `&timezone=America/New_York` +
            cacheBust,
          noCacheOpts
        ),
      ])

      if (forecastRes.ok) setForecast(await forecastRes.json())
      if (hourlyRes.ok) setHourlyForecast(await hourlyRes.json())
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.features || [])
      }
      if (modelRes.ok) setModelData(await modelRes.json())

      // Merge GFS and Canadian GEM snow data - use higher values
      if (dailyRes.ok) {
        const gfsDaily = await dailyRes.json()
        if (gemRes.ok) {
          const gemDaily = await gemRes.json()
          if (gemDaily.daily?.snowfall_sum && gfsDaily.daily?.snowfall_sum) {
            gfsDaily.daily.snowfall_sum = gfsDaily.daily.snowfall_sum.map((gfs, i) =>
              Math.max(gfs, gemDaily.daily.snowfall_sum[i] || 0)
            )
          }
        }
        setDailyForecast(gfsDaily)
      }
      if (aqiRes.ok) setAirQuality(await aqiRes.json())
    } catch (err) {
      console.error('Error fetching weather data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWeatherData(location)
    // Auto-refresh forecast every 15 minutes
    const interval = setInterval(() => {
      fetchWeatherData(location)
    }, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [location, fetchWeatherData])

  const handleSearch = async (query) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`
      )
      const data = await res.json()
      setSearchResults(data.results || [])
      setShowResults(true)
    } catch (err) {
      console.error('Geocoding error:', err)
    }
  }

  const selectLocation = (result) => {
    setLocation({
      name: `${result.name}, ${result.admin1 || result.country}`,
      lat: result.latitude,
      lon: result.longitude,
      state: result.admin1 || result.country_code,
    })
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
  }

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        // Reverse geocode to get location name
        try {
          const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${latitude.toFixed(2)},${longitude.toFixed(2)}&count=1`
          )
          // Use reverse geocoding
          const reverseRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const reverseData = await reverseRes.json()
          const name = reverseData.address?.city ||
                       reverseData.address?.town ||
                       reverseData.address?.village ||
                       reverseData.address?.county ||
                       'Current Location'
          const state = reverseData.address?.state || reverseData.address?.country || ''

          setLocation({
            name: `${name}, ${state}`,
            lat: latitude,
            lon: longitude,
            state: reverseData.address?.['ISO3166-2-lvl4']?.split('-')[1] || state,
          })
        } catch {
          setLocation({
            name: 'Current Location',
            lat: latitude,
            lon: longitude,
            state: 'PA', // fallback
          })
        }
        setLocating(false)
      },
      (err) => {
        setError('Unable to get your location: ' + err.message)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  return (
    <div className="min-h-screen">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <img src="/icons/icon-192.png" alt="WeatherMin" className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl shadow-md" />
              <h1 className="hidden sm:block text-xl font-bold text-slate-800 dark:text-white">WeatherMin</h1>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleSearch(e.target.value)
                }}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-transparent rounded-full text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:shadow-lg focus:shadow-blue-100 dark:focus:shadow-none transition-all"
              />
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">
                  {searchResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => selectLocation(result)}
                      className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
                    >
                      <MapPin className="w-4 h-4 text-blue-500" />
                      <div>
                        <div className="text-slate-700 dark:text-slate-200 font-medium">{result.name}</div>
                        <div className="text-xs text-slate-500">
                          {result.admin1 && `${result.admin1}, `}
                          {result.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => fetchWeatherData(location)}
              className="p-2 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* User Auth */}
            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-full bg-blue-500 hover:bg-blue-600 transition-colors text-white shadow-md shadow-blue-200 dark:shadow-none">
                  <LogIn className="w-4 h-4" />
                  <span className="text-sm font-semibold hidden sm:inline">Sign In</span>
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: 'w-9 h-9',
                  }
                }}
                afterSignOutUrl="/"
              />
            </SignedIn>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pt-24 sm:pt-20 pb-6">
        {error && (
          <Card className="mb-6 border-rose-500/30 bg-rose-500/10">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Weather Brief - What you need to know */}
        <WeatherBrief modelData={modelData} dailyForecast={dailyForecast} airQuality={airQuality} location={location} />

        {/* Weather Alerts */}
        <AlertBanner alerts={alerts} />

        {/* Radar + Quick Stats Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <MiniRadar location={location} />
          <QuickStats modelData={modelData} dailyForecast={dailyForecast} airQuality={airQuality} />
        </div>

        {/* Satellite Loop */}
        <div className="mb-6">
          <SatelliteLoop location={location} />
        </div>

        {/* Air Quality */}
        <AirQualityCard airQuality={airQuality} />

        {/* Hourly Forecast Strip */}
        <HourlyStrip modelData={modelData} dailyForecast={dailyForecast} />

        {/* 10-Day Forecast Strip */}
        {dailyForecast && <TenDayStrip dailyForecast={dailyForecast} />}

        {/* Calendar Month View */}
        {dailyForecast && <CalendarMonth dailyForecast={dailyForecast} />}

        {/* Data Sources */}
        <DataSourcesPage
          location={location}
          modelData={modelData}
          dailyForecast={dailyForecast}
          airQuality={airQuality}
          alerts={alerts}
        />
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 relative">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-400">
          <p className="mb-2">Made with ☀️ for sunny days and ☔ for rainy ones</p>
          <p>
            Data from{' '}
            <a
              href="https://www.weather.gov/documentation/services-web-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              NWS
            </a>
            {' & '}
            <a
              href="https://open-meteo.com/en/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              Open-Meteo
            </a>
          </p>
        </div>
        <div className="fixed bottom-3 right-3 text-xs text-slate-300 dark:text-slate-600 font-mono">
          v1.5.8
        </div>
      </footer>
    </div>
  )
}
