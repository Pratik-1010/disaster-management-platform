import { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { useNotifications, TYPES } from '../context/NotificationContext'
import './MapViewPage.css'

const REQUESTS_URL = 'http://localhost:5000/api/requests'

const HELP_TYPE_COLORS = {
  Rescue: '#dc2626',
  Medicine: '#ea580c',
  Food: '#16a34a',
  Shelter: '#2563eb',
}

const defaultCenter = [18.5204, 73.8567]

function FitBounds({ requests }) {
  const map = useMap()
  const withCoords = useMemo(() => requests.filter((r) => r.latitude != null && r.longitude != null), [requests])
  useEffect(() => {
    if (withCoords.length === 0) return
    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude, withCoords[0].longitude], 14)
      return
    }
    const bounds = withCoords.map((r) => [r.latitude, r.longitude])
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [map, withCoords])
  return null
}

export default function MapViewPage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const { addNotification } = useNotifications()

  async function loadRequests() {
    const res = await fetch(REQUESTS_URL)
    const json = await res.json()
    if (json.success) {
      setRequests(Array.isArray(json.data) ? json.data : [])
    } else {
      setRequests([])
    }
    console.log('Loaded requests:', json.data)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadRequests()
      .catch((err) => {
        if (!cancelled) {
          addNotification({ type: TYPES.ERROR, title: 'Failed to load map data', message: err.message })
          setRequests([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [addNotification])

  const withLocation = useMemo(() => requests.filter((r) => r.latitude != null && r.longitude != null), [requests])

  return (
    <div className="map-view-page">
      <aside className="map-sidebar">
        <h2 className="map-sidebar-title">Live Requests</h2>
        <div className="map-legend">
          <span className="map-legend-item" style={{ color: HELP_TYPE_COLORS.Rescue }}>Red = Rescue</span>
          <span className="map-legend-item" style={{ color: HELP_TYPE_COLORS.Medicine }}>Orange = Medicine</span>
          <span className="map-legend-item" style={{ color: HELP_TYPE_COLORS.Food }}>Green = Food</span>
          <span className="map-legend-item" style={{ color: HELP_TYPE_COLORS.Shelter }}>Blue = Shelter</span>
        </div>
        <ul className="map-request-list">
          {loading ? (
            <li className="map-request-placeholder">Loading...</li>
          ) : requests.length === 0 ? (
            <li className="map-request-placeholder">No requests yet.</li>
          ) : (
            requests.map((req) => (
              <li
                key={req.id}
                className={"map-request-item " + (selectedId === req.id ? "map-request-item--active" : "")}
                onClick={() => setSelectedId(req.id)}
              >
                <span className="map-request-dot" style={{ backgroundColor: HELP_TYPE_COLORS[req.helpType] || "#666" }} />
                <div>
                  <strong>{req.fullName}</strong> – {req.helpType}
                  <br />
                  <small>{req.status || 'pending'}</small>
                </div>
              </li>
            ))
          )}
        </ul>
      </aside>

      <div className="map-container-wrap">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          className="map-container"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!loading && <FitBounds requests={withLocation} />}
          {withLocation.map((req) => (
            <Marker
              key={req.id}
              position={[req.latitude, req.longitude]}
              eventHandlers={{ click: () => setSelectedId(req.id) }}
            >
              <Popup>
                <strong>Help Type:</strong> {req.helpType}<br />
                <strong>Person:</strong> {req.fullName}<br />
                <strong>Status:</strong> {req.status || 'pending'}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
