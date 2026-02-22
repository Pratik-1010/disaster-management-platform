import { Link } from 'react-router-dom'
import EmergencyContacts from '../components/EmergencyContacts'
import './HomePage.css'

const roleCards = [
  {
    title: 'Request Help (Victims)',
    description: 'Submit an emergency help request for food, medicine, rescue, or shelter. We will connect you with volunteers quickly.',
    to: '/request-help',
    icon: '🆘',
    cta: 'Request Help',
  },
  {
    title: 'Volunteer Dashboard',
    description: 'View and accept help requests. Mark tasks as completed when done.',
    to: '/volunteer',
    icon: '🙋',
    cta: 'Go to Dashboard',
  },
  {
    title: 'Admin Monitoring',
    description: 'Monitor all requests, volunteers, and activity in real time.',
    to: '/admin',
    icon: '📊',
    cta: 'Admin Dashboard',
  },
]

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="hero-bg-shape hero-bg-shape--1" />
          <div className="hero-bg-shape hero-bg-shape--2" />
          <div className="hero-bg-shape hero-bg-shape--3" />
          <div className="hero-bg-grid" />
        </div>
        <div className="hero-content">
          <h1 className="hero-title">Disaster Response & Relief Platform</h1>
          <p className="hero-subtitle">
            Connecting victims, volunteers, and NGOs in real-time during emergencies.
          </p>
          <Link to="/request-help" className="hero-cta">
            Request Help Now
          </Link>
        </div>
      </section>

      <EmergencyContacts />

      <section className="roles">
        <div className="roles-inner">
          <h2 className="roles-heading">How you can help</h2>
          <div className="role-cards">
            {roleCards.map((card) => (
              <article key={card.to} className="role-card">
                <div className="role-card-icon" aria-hidden="true">
                  {card.icon}
                </div>
                <h3 className="role-card-title">{card.title}</h3>
                <p className="role-card-desc">{card.description}</p>
                <Link to={card.to} className="role-card-link">
                  {card.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
