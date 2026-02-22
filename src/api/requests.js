import { api } from './client'
import * as mock from './mock.js'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const HELP_TYPES = ['Food', 'Medicine', 'Rescue', 'Shelter']

export const DISASTER_TYPES = ['Flood', 'Earthquake', 'Fire', 'Cyclone', 'Landslide', 'Other']

async function createRequestReal(payload) {
  return api.post('/requests', payload)
}
async function listRequestsReal(params = {}) {
  const search = new URLSearchParams(params).toString()
  return api.get(`/requests${search ? `?${search}` : ''}`)
}
async function getRequestReal(id) {
  return api.get(`/requests/${id}`)
}
async function acceptRequestReal(id) {
  return api.patch(`/requests/${id}/accept`)
}
async function completeRequestReal(id) {
  return api.patch(`/requests/${id}/complete`)
}
async function confirmRequestReal(id) {
  return api.post(`/request/${id}/confirm`)
}
async function getAdminStatsReal() {
  return api.get('/admin/stats')
}
async function getActivityReal(params = {}) {
  const search = new URLSearchParams(params).toString()
  return api.get(`/admin/activity${search ? `?${search}` : ''}`)
}

export async function login(credentials) {
  if (USE_MOCK) return mock.mockLogin(credentials)
  return api.post('/login', credentials)
}

export async function register(data) {
  if (USE_MOCK) return mock.mockRegister(data)
  return api.post('/register', data)
}

export async function logout() {
  if (USE_MOCK) return mock.mockLogout()
  return api.post('/logout')
}

export async function createAdmin(data) {
  if (USE_MOCK) return mock.mockCreateAdmin(data)
  return api.post('/admin/create-admin', data)
}

export async function getVolunteers() {
  if (USE_MOCK) return mock.mockGetVolunteers()
  return api.get('/admin/volunteers')
}

export async function blockVolunteer(id) {
  if (USE_MOCK) return mock.mockBlockVolunteer(id)
  return api.put(`/admin/volunteer/${id}/block`)
}

export async function activateVolunteer(id) {
  if (USE_MOCK) return mock.mockActivateVolunteer(id)
  return api.put(`/admin/volunteer/${id}/activate`)
}

export async function deleteVolunteer(id) {
  if (USE_MOCK) return mock.mockDeleteVolunteer(id)
  return api.delete(`/admin/volunteer/${id}`)
}

export async function createRequest(payload) {
  if (USE_MOCK) return mock.mockCreateRequest(payload)
  return createRequestReal(payload)
}

export async function listRequests(params = {}) {
  if (USE_MOCK) return mock.mockListRequests()
  return listRequestsReal(params)
}

export async function getRequest(id) {
  if (USE_MOCK) return mock.mockGetRequest(id)
  return getRequestReal(id)
}

export async function acceptRequest(id) {
  if (USE_MOCK) return mock.mockAcceptRequest(id)
  return acceptRequestReal(id)
}

export async function completeRequest(id) {
  if (USE_MOCK) return mock.mockCompleteRequest(id)
  return completeRequestReal(id)
}

export async function confirmRequest(id) {
  if (USE_MOCK) return Promise.resolve({ accuracy_score: 60 })
  return confirmRequestReal(id)
}

export async function getAdminStats() {
  if (USE_MOCK) return mock.mockGetAdminStats()
  return getAdminStatsReal()
}

export async function getActivity(params = {}) {
  if (USE_MOCK) return mock.mockGetActivity()
  return getActivityReal(params)
}
