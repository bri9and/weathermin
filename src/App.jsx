import { useState, useEffect, useCallback, useMemo } from 'react'
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
} from 'lucide-react'
import { MapContainer, TileLayer, useMap, GeoJSON, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_LOCATION = {
  name: 'Cranberry Township, PA',
  lat: 40.6834,
  lon: -80.1067,
  state: 'PA',
}

const TABS = [
  { id: 'forecast', label: 'Forecast' },
  { id: 'hourly', label: 'Hourly' },
  { id: 'radar', label: 'Radar' },
  { id: 'models', label: 'Models' },
  { id: 'links', label: 'Links' },
]

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
    <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        active
          ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
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

  // Show button to view alerts after cycling completes
  if (hasCompleted && !isExpanded) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-amber-200 text-sm font-medium">
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
          <span className="text-amber-200 text-sm font-medium">
            {alerts.length} Active Alert{alerts.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => {
              setIsExpanded(false)
              setHasCompleted(true)
            }}
            className="text-slate-400 hover:text-slate-200 text-sm"
          >
            Dismiss
          </button>
        </div>
        {alerts.map((alert, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg"
          >
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-amber-200 font-medium truncate">{alert.properties?.headline}</p>
              <p className="text-amber-200/60 text-sm truncate">{alert.properties?.areaDesc}</p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Show single alert cycling view
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-fade-in">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-amber-200 font-medium truncate">{currentAlert?.properties?.headline}</p>
          <p className="text-amber-200/60 text-sm truncate">{currentAlert?.properties?.areaDesc}</p>
        </div>
        <div className="text-xs text-amber-200/40 shrink-0">
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
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
            <MapPin className="w-4 h-4" />
            <span>{location.name}</span>
          </div>
          <div className="text-5xl font-light text-white">
            {Math.round(current.temperature_2m)}°
            <span className="text-2xl text-slate-400">F</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-sm">Feels like</div>
          <div className="text-2xl text-slate-200">
            {Math.round(current.apparent_temperature)}°F
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-sky-400" />
          <div>
            <div className="text-xs text-slate-500">Humidity</div>
            <div className="text-slate-200">{current.relative_humidity_2m}%</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="text-xs text-slate-500">Wind</div>
            <div className="text-slate-200">{Math.round(current.wind_speed_10m)} mph</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-amber-400" />
          <div>
            <div className="text-xs text-slate-500">Direction</div>
            <div className="text-slate-200">{current.wind_direction_10m}°</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-rose-400" />
          <div>
            <div className="text-xs text-slate-500">Pressure</div>
            <div className="text-slate-200">{Math.round(current.surface_pressure)} mb</div>
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
        <div className="p-3 rounded-lg bg-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">UV Index</div>
          <div className={`text-2xl font-light ${uvLevel.color}`}>{uvIndex.toFixed(1)}</div>
          <div className={`text-sm ${uvLevel.color}`}>{uvLevel.label}</div>
        </div>

        {/* Humidity */}
        <div className="p-3 rounded-lg bg-slate-700/30">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Droplets className="w-3 h-3" />
            Humidity
          </div>
          <div className="text-2xl font-light text-slate-200">{current.relative_humidity_2m}%</div>
          <div className="text-sm text-slate-400">Dew {Math.round(dewPoint)}°F</div>
        </div>

        {/* Visibility */}
        <div className="p-3 rounded-lg bg-slate-700/30">
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1">
            <Eye className="w-3 h-3" />
            Visibility
          </div>
          <div className="text-2xl font-light text-slate-200">{visibilityMiles}</div>
          <div className="text-sm text-slate-400">miles</div>
        </div>

        {/* Sunrise */}
        <div className="p-3 rounded-lg bg-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Sunrise</div>
          <div className="text-2xl font-light text-amber-400">{sunriseTime}</div>
          <div className="text-sm text-slate-400">AM</div>
        </div>

        {/* Sunset */}
        <div className="p-3 rounded-lg bg-slate-700/30">
          <div className="text-xs text-slate-400 mb-1">Sunset</div>
          <div className="text-2xl font-light text-orange-400">{sunsetTime}</div>
          <div className="text-sm text-slate-400">PM</div>
        </div>
      </div>

      {/* Air Quality Details */}
      {aqi && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="text-xs text-slate-400 mb-2">Air Quality Details</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-slate-500">PM2.5</span>
              <span className="ml-2 text-slate-300">{aqi.pm2_5?.toFixed(1)} µg/m³</span>
            </div>
            <div>
              <span className="text-slate-500">PM10</span>
              <span className="ml-2 text-slate-300">{aqi.pm10?.toFixed(1)} µg/m³</span>
            </div>
            <div>
              <span className="text-slate-500">Ozone</span>
              <span className="ml-2 text-slate-300">{aqi.ozone?.toFixed(1)} µg/m³</span>
            </div>
            <div>
              <span className="text-slate-500">NO₂</span>
              <span className="ml-2 text-slate-300">{aqi.nitrogen_dioxide?.toFixed(1)} µg/m³</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function MiniRadar({ location }) {
  const [radarFrames, setRadarFrames] = useState([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const center = useMemo(() => [location.lat, location.lon], [location.lat, location.lon])

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

  // Auto-play animation (slower for better viewing)
  useEffect(() => {
    if (radarFrames.length === 0) return
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % radarFrames.length)
    }, 1500) // Slower animation
    return () => clearInterval(interval)
  }, [radarFrames.length])

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
    <Card className="p-0 overflow-hidden">
      <div className="h-[250px] relative">
        <MapContainer
          center={center}
          zoom={7}
          className="h-full w-full"
          style={{ background: '#1e293b' }}
          zoomControl={false}
          attributionControl={false}
        >
          <MapUpdater center={center} />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {currentRadarUrl && <TileLayer url={currentRadarUrl} opacity={0.7} />}
        </MapContainer>
        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-300 z-[1000] flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          {frameTime}
          {timeRange && <span className="text-slate-500">({timeRange})</span>}
        </div>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800 z-[1000]">
          <div
            className="h-full bg-sky-500 transition-all duration-300"
            style={{ width: `${((currentFrame + 1) / radarFrames.length) * 100}%` }}
          />
        </div>
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

      {/* Mini Radar */}
      <MiniRadar location={location} />

      {/* 10-Day Forecast */}
      <div>
        <h3 className="text-slate-200 font-medium mb-3 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-sky-400" />
          10-Day Forecast
        </h3>
        <div className="grid gap-2">
          {daily.time.map((date, i) => {
            const weatherCode = daily.weather_code[i]
            const Icon = getWeatherIconFromCode(weatherCode)
            const isSnowy = [71, 73, 75, 77, 85, 86].includes(weatherCode)
            const snowfall = daily.snowfall_sum[i] / 2.54 // Convert cm to inches
            const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
              new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
            const fullDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

            return (
              <Card key={i} className={`flex items-center gap-3 ${snowfall > 0 ? 'border-sky-500/30 bg-sky-500/5' : ''}`}>
                <div className="w-24 shrink-0">
                  <div className="text-slate-200 font-medium">{dayName}</div>
                  <div className="text-xs text-slate-500">{fullDate}</div>
                </div>
                <Icon className={`w-7 h-7 shrink-0 ${isSnowy ? 'text-sky-300' : 'text-amber-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-light text-white">{Math.round(daily.temperature_2m_max[i])}°</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-400">{Math.round(daily.temperature_2m_min[i])}°</span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{getWeatherDescription(weatherCode)}</p>
                </div>
                {/* Snow indicator */}
                {snowfall > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-sky-500/20 rounded-lg shrink-0">
                    <Snowflake className="w-4 h-4 text-sky-300" />
                    <span className="text-sky-200 font-medium">{snowfall.toFixed(1)}"</span>
                  </div>
                )}
                {/* Precip probability */}
                {daily.precipitation_probability_max[i] > 0 && !snowfall && (
                  <div className="flex items-center gap-1 text-slate-400 shrink-0">
                    <Droplets className="w-4 h-4" />
                    <span className="text-sm">{daily.precipitation_probability_max[i]}%</span>
                  </div>
                )}
                {/* Wind */}
                <div className="text-right shrink-0 hidden sm:block">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Wind className="w-4 h-4" />
                    <span className="text-sm">{Math.round(daily.wind_speed_10m_max[i])} mph</span>
                  </div>
                  {daily.wind_gusts_10m_max[i] > daily.wind_speed_10m_max[i] + 10 && (
                    <div className="text-xs text-slate-500">
                      Gusts {Math.round(daily.wind_gusts_10m_max[i])} mph
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Snow Summary */}
      {daily.snowfall_sum.some(s => s > 0) && (
        <Card className="border-sky-500/30 bg-sky-500/5">
          <h3 className="text-sky-200 font-medium mb-2 flex items-center gap-2">
            <Snowflake className="w-5 h-5" />
            Snow Forecast
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {daily.time.map((date, i) => {
              const snowCm = daily.snowfall_sum[i]
              if (snowCm === 0) return null
              const snow = snowCm / 2.54 // Convert cm to inches
              const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' :
                new Date(date).toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={i} className="text-center">
                  <div className="text-slate-400 text-sm">{dayName}</div>
                  <div className="text-2xl font-light text-sky-200">{snow.toFixed(1)}"</div>
                </div>
              )
            }).filter(Boolean)}
            <div className="text-center">
              <div className="text-slate-400 text-sm">10-Day Total</div>
              <div className="text-2xl font-light text-sky-200">
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
                {daily.time.map((date, i) => {
                  const snowCm = daily.snowfall_sum[i]
                  const snow = snowCm / 2.54 // Convert cm to inches
                  const precip = daily.precipitation_sum[i]
                  return (
                    <tr key={i} className={`border-t border-slate-700/50 ${snow > 0.05 ? 'bg-sky-500/5' : ''}`}>
                      <td className="py-2 pr-4 text-slate-300">
                        {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
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
        <div className="h-[500px] relative">
          <MapContainer
            center={center}
            zoom={8}
            className="h-full w-full"
            style={{ background: '#1e293b' }}
          >
            <MapUpdater center={center} />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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

function LinksTab() {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {Object.entries(WEATHER_LINKS).map(([category, links]) => (
        <Card key={category}>
          <h3 className="text-slate-200 font-medium mb-3">{category}</h3>
          <div className="space-y-2">
            {links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors group"
              >
                <span className="text-slate-300 group-hover:text-sky-400">{link.name}</span>
                <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-sky-400" />
              </a>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default function App() {
  const [location, setLocation] = useState(DEFAULT_LOCATION)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showResults, setShowResults] = useState(false)
  const [activeTab, setActiveTab] = useState('forecast')
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
      const [forecastRes, hourlyRes, alertsRes, modelRes, dailyRes, gemRes, aqiRes] = await Promise.all([
        fetch(forecastUrl, { headers: { 'User-Agent': 'WeatherDashboard/1.0' } }),
        fetch(hourlyUrl, { headers: { 'User-Agent': 'WeatherDashboard/1.0' } }),
        fetch(`https://api.weather.gov/alerts/active?area=${loc.state}`, {
          headers: { 'User-Agent': 'WeatherDashboard/1.0' },
        }),
        fetch(
          `https://api.open-meteo.com/v1/gfs?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,` +
            `weather_code,surface_pressure,wind_speed_10m,wind_direction_10m` +
            `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,` +
            `precipitation,weather_code,wind_speed_10m,wind_direction_10m,cape,snowfall` +
            `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America/New_York`
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
            `&timezone=America/New_York&forecast_days=16`
        ),
        // Canadian GEM model for snow comparison (often higher for Northeast US)
        fetch(
          `https://api.open-meteo.com/v1/gem?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&daily=snowfall_sum` +
            `&timezone=America/New_York&forecast_days=16`
        ),
        // Air quality data
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${loc.lat}&longitude=${loc.lon}` +
            `&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone` +
            `&timezone=America/New_York`
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
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">WeatherMin</h1>
                <p className="text-xs text-slate-400">NWS + GFS/HRRR Data</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
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
                placeholder="Search location..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50"
              />
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
                  {searchResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => selectLocation(result)}
                      className="w-full px-4 py-3 text-left hover:bg-slate-700/50 flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="text-slate-200">{result.name}</div>
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
              className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 text-slate-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {error && (
          <Card className="mb-6 border-rose-500/30 bg-rose-500/10">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        <AlertBanner alerts={alerts} />

        {modelData && <CurrentConditions data={modelData} location={location} />}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <TabButton
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </TabButton>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'forecast' && <ForecastTab forecast={forecast} dailyForecast={dailyForecast} location={location} modelData={modelData} airQuality={airQuality} />}
          {activeTab === 'hourly' && <HourlyTab forecast={hourlyForecast} />}
          {activeTab === 'radar' && <RadarTab location={location} onGeolocate={handleGeolocate} locating={locating} />}
          {activeTab === 'models' && <ModelsTab modelData={modelData} location={location} />}
          {activeTab === 'links' && <LinksTab />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6 text-center text-sm text-slate-500">
          <p>Data from NWS (api.weather.gov) and Open-Meteo (GFS/HRRR)</p>
          <p className="mt-1">
            <a
              href="https://www.weather.gov/documentation/services-web-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline"
            >
              NWS API Docs
            </a>
            {' · '}
            <a
              href="https://open-meteo.com/en/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400 hover:underline"
            >
              Open-Meteo Docs
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
