/**
 * Mock API for development when no backend is running.
 * Set VITE_USE_MOCK=true in .env to use.
 */

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

let mockRequests = [
  {
    id: '1',
    fullName: 'Sample Victim',
    phoneNumber: '+1234567890',
    helpType: 'Food',
    disasterType: 'Flood',
    description: 'Need food and water.',
    latitude: 18.52,
    longitude: 73.85,
    status: 'pending',
  },
]

export async function mockCreateRequest(payload) {
  await delay(400)
  const newReq = {
    id: String(Date.now()),
    ...payload,
    status: 'pending',
  }
  mockRequests.push(newReq)
  return newReq
}

export async function mockListRequests() {
  await delay(300)
  return [...mockRequests]
}

export async function mockGetRequest(id) {
  await delay(200)
  return mockRequests.find((r) => r.id === id) || null
}

export async function mockAcceptRequest(id) {
  await delay(300)
  const r = mockRequests.find((x) => x.id === id)
  if (r) r.status = 'accepted'
  return r
}

export async function mockCompleteRequest(id) {
  await delay(300)
  const r = mockRequests.find((x) => x.id === id)
  if (r) r.status = 'completed'
  return r
}

export async function mockGetAdminStats() {
  await delay(200)
  const pending = mockRequests.filter((r) => r.status === 'pending').length
  const completed = mockRequests.filter((r) => r.status === 'completed').length
  return {
    totalRequests: mockRequests.length,
    pendingRequests: pending,
    activeVolunteers: 2,
    completedRequests: completed,
  }
}

export async function mockGetActivity() {
  await delay(200)
  return []
}

export async function mockLogin({ email, password }) {
  await delay(300)
  if (email === 'admin@dm.com' && password === '12345') {
    return { message: 'Login successful', role: 'admin', name: 'Pratik more' }
  }
  return { message: 'Login successful', role: 'volunteer', name: 'Volunteer' }
}

export async function mockRegister(data) {
  await delay(300)
  return { message: 'Registration successful' }
}

export async function mockLogout() {
  await delay(100)
  return { message: 'Logged out' }
}

export async function mockCreateAdmin(data) {
  await delay(300)
  return { message: 'Admin created successfully' }
}

let mockVolunteers = [
  { id: 1, name: 'Volunteer One', email: 'v1@test.com', phone: '+111', organization: 'NGO A', is_active: 1, created_at: '2024-01-01 12:00:00' },
  { id: 2, name: 'Volunteer Two', email: 'v2@test.com', phone: '+222', organization: 'Independent', is_active: 0, created_at: '2024-01-02 12:00:00' },
]

export async function mockGetVolunteers() {
  await delay(300)
  return [...mockVolunteers]
}

export async function mockBlockVolunteer(id) {
  await delay(200)
  const v = mockVolunteers.find((x) => x.id === id)
  if (v) v.is_active = 0
  return { message: 'Volunteer blocked' }
}

export async function mockActivateVolunteer(id) {
  await delay(200)
  const v = mockVolunteers.find((x) => x.id === id)
  if (v) v.is_active = 1
  return { message: 'Volunteer activated' }
}

export async function mockDeleteVolunteer(id) {
  await delay(200)
  mockVolunteers = mockVolunteers.filter((x) => x.id !== id)
  return { message: 'Volunteer deleted' }
}
