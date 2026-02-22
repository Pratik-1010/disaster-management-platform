import './EmergencyContacts.css'

const EMERGENCY_SERVICES = [
  { name: 'Police', number: '100', description: 'Police emergency response across India.' },
  { name: 'Ambulance', number: '108', description: 'Emergency medical services and ambulance.' },
  { name: 'Fire Brigade', number: '101', description: 'Fire and rescue services just call 101.' },
  { name: 'National Emergency', number: '112', description: 'Single number for all emergencies.' },
  { name: 'Women Helpline', number: '1091', description: '24/7 support for women in distress.' },
  { name: 'Child Helpline', number: '1098', description: 'Help for children in need of care.' },
  { name: 'Disaster Management', number: '1078', description: 'Disaster and emergency coordination.' },
  { name: 'Health Helpline', number: '104', description: 'Health information and medical queries.' },
]

export default function EmergencyContacts() {
  return (
    <section className="emergency-contacts">
      <div className="emergency-contacts-inner">
        <h2 className="emergency-contacts-heading">Emergency Contacts (India)</h2>

        <div className="emergency-info-box">
          <h3 className="emergency-info-title">How to Contact Emergency Services</h3>
          <ul className="emergency-info-list">
            <li>Call 112 if unsure which number to use</li>
            <li>Share your location clearly</li>
            <li>Describe the type of emergency</li>
            <li>Follow operator instructions</li>
          </ul>
        </div>

        <div className="emergency-cards">
          {EMERGENCY_SERVICES.map((service) => (
            <article key={service.number} className="emergency-card">
              <h3 className="emergency-card-title">{service.name}</h3>
              <p className="emergency-card-number">{service.number}</p>
              <p className="emergency-card-desc">{service.description}</p>
              <a href={`tel:${service.number}`} className="emergency-card-call">
                Call
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
