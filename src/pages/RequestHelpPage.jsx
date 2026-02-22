import { useState } from 'react'
import { HELP_TYPES, DISASTER_TYPES } from '../api/requests'
import { useNotifications, TYPES } from '../context/NotificationContext'
import './RequestHelpPage.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

async function submitRequest(data) {
  const response = await fetch(`${API_BASE}/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  console.log('API response:', result)
  return { response, result }
}

const helpTypeIcons = {
  Food: '\uD83C\uDF5E',
  Medicine: '\uD83D\uDC8A',
  Rescue: '\uD83D\uDE91',
  Shelter: '\uD83C\uDFE0',
}

const initialForm = {
  fullName: '',
  phoneNumber: '',
  disasterType: '',
  helpType: 'Rescue',
  description: '',
  latitude: '',
  longitude: '',
}

export default function RequestHelpPage() {
  const [form, setForm] = useState(initialForm)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [locationError, setLocationError] = useState(null)
  const { addNotification } = useNotifications()

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSuccess(false)
  }

  const detectLocation = () => {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update('latitude', String(pos.coords.latitude))
        update('longitude', String(pos.coords.longitude))
        addNotification({
          type: TYPES.SUCCESS,
          title: 'Location detected',
          message: 'Your coordinates have been set.',
        })
      },
      () => {
        setLocationError('Could not get your location. Please allow location access or enter manually.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSuccess(false)
    const payload = {
      name: form.fullName.trim() || undefined,
      phone: form.phoneNumber.trim() || undefined,
      disaster_type: form.disasterType.trim() || undefined,
      help_type: form.helpType || undefined,
      description: form.description.trim() || undefined,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    }
    try {
      const { response, result } = await submitRequest(payload)
      if (response.ok && result?.success) {
        setSuccess(true)
        setForm(initialForm)
        addNotification({
          type: TYPES.SUCCESS,
          title: 'Emergency request sent',
          message: 'Help is on the way. Volunteers will be notified.',
          duration: 7000,
        })
        try {
          await fetch(`${API_BASE}/requests`)
        } catch (_) {}
      } else {
        addNotification({
          type: TYPES.ERROR,
          title: 'Request failed',
          message: result?.message || 'Could not send request. Please try again.',
        })
      }
    } catch (err) {
      addNotification({
        type: TYPES.ERROR,
        title: 'Request failed',
        message: err.message || 'Could not send request. Please try again.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="request-help-page">
      <div className="request-help-card">
        <div className="request-help-header">
          <span className="request-help-icon" aria-hidden="true">&#x1F698;</span>
          <h1 className="request-help-title">Request Emergency Help</h1>
          <p className="request-help-subtitle">Fill in your details. We will connect you with volunteers as soon as possible.</p>
        </div>

        {success && (
          <div className="request-help-success" role="alert">
            <strong>Request sent successfully.</strong> Volunteers have been notified. Stay safe.
          </div>
        )}

        <form onSubmit={handleSubmit} className="request-help-form">
          <label className="request-help-label">Full Name</label>
          <input
            type="text"
            className="request-help-input"
            placeholder="Optional (leave blank if urgent)"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
          />

          <label className="request-help-label">Phone Number</label>
          <input
            type="tel"
            className="request-help-input"
            placeholder="Optional contact number"
            value={form.phoneNumber}
            onChange={(e) => update('phoneNumber', e.target.value)}
          />

          <label className="request-help-label">Disaster Type</label>
          <div className="request-help-type-wrap">
            <select
              className="request-help-select"
              value={form.disasterType}
              onChange={(e) => update('disasterType', e.target.value)}
            >
              <option value="">Select disaster type</option>
              {DISASTER_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <label className="request-help-label">Help Type</label>
          <div className="request-help-type-wrap">
            <select
              className="request-help-select"
              value={form.helpType}
              onChange={(e) => update('helpType', e.target.value)}
            >
              {HELP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {helpTypeIcons[type]} {type}
                </option>
              ))}
            </select>
          </div>

          <label className="request-help-label">Description</label>
          <textarea
            className="request-help-textarea"
            placeholder="Optional details"
            rows={4}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />

          <fieldset className="request-help-location">
            <legend className="request-help-label">Location (auto or manual)</legend>
            <div className="request-help-location-row">
              <label className="request-help-label-inline">Latitude</label>
              <input
                type="text"
                className="request-help-input request-help-input--half"
                placeholder="e.g. 18.5204"
                value={form.latitude}
                onChange={(e) => update('latitude', e.target.value)}
              />
              <label className="request-help-label-inline">Longitude</label>
              <input
                type="text"
                className="request-help-input request-help-input--half"
                placeholder="e.g. 73.8567"
                value={form.longitude}
                onChange={(e) => update('longitude', e.target.value)}
              />
            </div>
            <button
              type="button"
              className="request-help-detect-btn"
              onClick={detectLocation}
            >
              📍 Detect My Location
            </button>
            {locationError && (
              <p className="request-help-error" role="alert">{locationError}</p>
            )}
          </fieldset>

          <p className="request-help-note">In emergencies, only location is required.</p>

          <button
            type="submit"
            className="request-help-submit"
            disabled={submitting}
          >
            {submitting ? 'Sending...' : 'Send Emergency Request'}
          </button>
        </form>
      </div>
    </div>
  )
}
