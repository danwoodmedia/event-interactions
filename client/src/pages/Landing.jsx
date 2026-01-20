import { Link } from 'react-router-dom'
import './Landing.css'

function Landing() {
  return (
    <div className="landing-container">
      {/* Navigation Bar */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">Event Interactions</div>
        <div className="landing-nav-links">
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#benefits" className="landing-nav-link">About Us</a>
          <a href="#pricing" className="landing-nav-link">Pricing</a>
          <a href="#contact" className="landing-nav-link">Contact</a>
        </div>
        <Link to="/login" className="landing-nav-signin">
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h1>One Stop Solution For Your Event Interactions</h1>
          <p>
            Engage your audience with real-time emoji reactions, interactive polls,
            and live Q&A. Create unforgettable event experiences with our powerful platform.
          </p>
          <div className="landing-hero-ctas">
            <Link to="/signup" className="landing-btn landing-btn--primary">
              Get Started
            </Link>
            <Link to="/login" className="landing-btn landing-btn--secondary">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-section landing-section--dark">
        <h2 className="landing-section-title">Powerful Features</h2>
        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">🔥</div>
            <h3 className="landing-feature-title">Real-Time Emoji Reactions</h3>
            <p className="landing-feature-description">
              Let your audience express themselves instantly with customizable emoji reactions
              that appear live on screen during your event.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">📊</div>
            <h3 className="landing-feature-title">Interactive Polling</h3>
            <p className="landing-feature-description">
              Create engaging polls with multiple choice, live results, and advanced settings.
              Perfect for gathering audience feedback in real-time.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">💬</div>
            <h3 className="landing-feature-title">Live Q&A Moderation</h3>
            <p className="landing-feature-description">
              Moderate audience questions in real-time with approval workflows, featured questions,
              and seamless integration with your event flow.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">📺</div>
            <h3 className="landing-feature-title">Display Management</h3>
            <p className="landing-feature-description">
              Professional display outputs with customizable layouts, positioning, and effects.
              Perfect for streaming, projection, or broadcast.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="landing-section landing-section--light">
        <h2 className="landing-section-title">Built For Everyone</h2>
        <div className="landing-benefits-grid">
          <div className="landing-benefit-card">
            <h3>For Producers</h3>
            <p>
              Complete control over your event with an intuitive dashboard. Create polls,
              manage emoji packs, moderate Q&A, and monitor engagement in real-time.
            </p>
          </div>

          <div className="landing-benefit-card">
            <h3>For Audiences</h3>
            <p>
              Simple, seamless participation with no app downloads required. Join with a
              code and start engaging immediately from any device.
            </p>
          </div>

          <div className="landing-benefit-card">
            <h3>For A/V Teams</h3>
            <p>
              Dedicated technical controls for display settings, poll positioning, and
              emoji effects. Fine-tune everything for the perfect broadcast experience.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="landing-section landing-section--dark">
        <h2 className="landing-section-title">Simple Pricing</h2>
        <div className="landing-pricing-content">
          <p className="landing-pricing-description">
            Get started for free and scale as your events grow. Contact us for enterprise pricing
            and custom solutions tailored to your needs.
          </p>
          <Link to="/signup" className="landing-btn landing-btn--primary">
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="landing-footer">
        <p>&copy; 2026 Event Interactions. All rights reserved.</p>
        <div className="landing-footer-links">
          <a href="#" className="landing-footer-link">Terms of Service</a>
          <span className="landing-footer-divider">•</span>
          <a href="#" className="landing-footer-link">Privacy Policy</a>
          <span className="landing-footer-divider">•</span>
          <a href="#" className="landing-footer-link">Contact</a>
        </div>
      </footer>
    </div>
  )
}

export default Landing
