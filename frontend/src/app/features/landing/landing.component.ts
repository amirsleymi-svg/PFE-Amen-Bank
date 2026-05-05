import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/components/logo/logo.component';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, LogoComponent],
  template: `
    <div class="landing">
      <!-- Navbar -->
      <nav class="nav glass-style">
        <div class="nav-inner">
          <div class="nav-logo animate-in">
            <app-logo [size]="34" variant="dark" />
          </div>
          <div class="nav-links">
            <a href="#features" class="outfit">Services</a>
            <a href="#about" class="outfit">À propos</a>
            <a href="#security" class="outfit">Sécurité</a>
            <a routerLink="/login" class="btn-nav outfit">
              <span>SE CONNECTER</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </nav>

      <!-- Hero Section -->
      <section class="hero-premium">
        <div class="hero-visual-bg">
          <div class="gradient-sphere sphere-1"></div>
          <div class="gradient-sphere sphere-2"></div>
          <div class="grid-overlay"></div>
        </div>
        
        <div class="container hero-container">
          <div class="hero-text-content animate-in">
            <div class="premium-badge outfit">
              <span class="gold-dot"></span>
              L'EXCELLENCE BANCAIRE DIGITALE
            </div>
            <h1 class="outfit">
              La Banque du Futur,<br>
              <span class="gold-text">Redéfinie par l'Intelligence.</span>
            </h1>
            <p class="hero-subtext outfit">
              Virements instantanés, crédits agiles et assistant IA. 
              Amen Bank fusionne sécurité institutionnelle et innovation de pointe pour une expérience sans friction.
            </p>
            <div class="hero-cta-group">
              <a routerLink="/register" class="btn btn-accent btn-lg outfit">OUVRIR MON COMPTE</a>
              <a href="#features" class="btn btn-ghost outfit">DÉCOUVRIR NOS SERVICES</a>
            </div>
          </div>

          <div class="hero-image-scene animate-in">
            <div class="floating-dashboard card glass-style">
              <div class="dash-head">
                <div class="dash-dot red"></div>
                <div class="dash-dot yellow"></div>
                <div class="dash-dot green"></div>
              </div>
              <div class="dash-stats">
                <div class="dash-stat">
                  <span class="outfit size-xs">SOLDE TOTAL</span>
                  <span class="outfit font-bold">128,450.000 <small>TND</small></span>
                </div>
                <div class="dash-chart">
                  <div class="bar" style="height: 40%"></div>
                  <div class="bar" style="height: 60%"></div>
                  <div class="bar" style="height: 90%"></div>
                  <div class="bar" style="height: 50%"></div>
                </div>
              </div>
            </div>
            <div class="floating-card-mockup">
              <div class="mock-card gold-gradient">
                <div class="mock-chip"></div>
                <div class="mock-logo">AMEN</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Trust Bar -->
      <div class="trust-bar border-top-glow" id="about">
        <div class="container flex-between">
          <span class="trust-label outfit">PARTENAIRE DE CONFIANCE :</span>
          <div class="trust-logos">
            <span class="trust-item outfit">🛡️ SÉCURITÉ ISO 27001</span>
            <span class="trust-item outfit">🏦 BANQUE CENTRALE DE TUNISIE</span>
            <span class="trust-item outfit">🔐 PROTECTION DES DONNÉES</span>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <section class="features-section" id="features">
        <div class="container">
          <div class="section-center-head">
            <h2 class="outfit">Services Bancaires de Haute Précision</h2>
            <p class="outfit">Une suite complète d'outils digitaux conçus pour une gestion patrimoniale moderne.</p>
          </div>

          <div class="features-matrix">
            @for (f of features; track f.key) {
              <div class="feature-tile animate-in" (click)="onFeatureClick(f.title)">
                <div class="tile-icon-box">
                  @switch (f.key) {
                    @case ('transfer') { <span class="icon">💸</span> }
                    @case ('card') { <span class="icon">💳</span> }
                    @case ('credit') { <span class="icon">📊</span> }
                    @case ('bot') { <span class="icon">🤖</span> }
                    @case ('repeat') { <span class="icon">🔄</span> }
                    @case ('dashboard') { <span class="icon">💻</span> }
                  }
                </div>
                <h3 class="outfit">{{ f.title }}</h3>
                <p class="outfit">{{ f.desc }}</p>
                <div class="tile-footer">
                  <span class="learn-more outfit">EN SAVOIR PLUS</span>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Security Showcase -->
      <section class="security-showcase" id="security">
        <div class="container">
          <div class="security-grid-premium">
            <div class="security-info-text animate-in">
              <h2 class="outfit">Forteresse Digitale</h2>
              <p class="outfit">Nous déployons les technologies les plus avancées pour garantir l'intégrité absolue de vos actifs et de vos données.</p>
              
              <div class="security-points">
                <div class="point-item">
                  <div class="point-icon">✓</div>
                  <div class="point-content">
                    <h4 class="outfit">Authentification Multi-Facteurs</h4>
                    <p class="outfit">Chaque transaction est protégée par une validation renforcée.</p>
                  </div>
                </div>
                <div class="point-item">
                  <div class="point-icon">✓</div>
                  <div class="point-content">
                    <h4 class="outfit">Surveillance Anti-Fraude</h4>
                    <p class="outfit">IA prédictive analysant les comportements suspects en temps réel.</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="security-visual-card animate-in">
              <div class="vault-icon">🔒</div>
              <div class="encryption-lines">
                <div class="line" style="width: 80%"></div>
                <div class="line" style="width: 100%"></div>
                <div class="line" style="width: 60%"></div>
              </div>
              <div class="security-status outfit">STATUT : SÉCURISÉ</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Final CTA -->
      <section class="final-cta">
        <div class="container text-center">
          <h2 class="outfit">Prêt à rejoindre l'élite bancaire ?</h2>
          <p class="outfit mb-2">Rejoignez des milliers de clients satisfaits et profitez d'une banque sans frontières.</p>
          <a routerLink="/register" class="btn btn-accent btn-lg outfit">CRÉER MON COMPTE MAINTENANT</a>
        </div>
      </section>

      <!-- Footer -->
      <footer class="premium-footer">
        <div class="container">
          <div class="footer-top">
            <app-logo [size]="40" variant="light" />
            <div class="footer-social">
              <span>FB</span><span>TW</span><span>LI</span>
            </div>
          </div>
          <div class="footer-grid">
            <div class="footer-col">
              <h5 class="outfit">SERVICES</h5>
              <a href="#">Comptes</a><a href="#">Cartes</a><a href="#">Crédits</a>
            </div>
            <div class="footer-col">
              <h5 class="outfit">ASSISTANCE</h5>
              <a href="#">Contact</a><a href="#">Aide</a><a href="#">Sécurité</a>
            </div>
            <div class="footer-col">
              <h5 class="outfit">LÉGAL</h5>
              <a href="#">Conditions</a><a href="#">Confidentialité</a>
            </div>
          </div>
          <div class="footer-bottom outfit">
            &copy; 2026 AMEN BANK TUNISIE. TOUS DROITS RÉSERVÉS.
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing { background: white; color: var(--primary); }
    
    .nav { position: fixed; top: 0; width: 100%; z-index: 1000; height: 80px; display: flex; align-items: center; border-bottom: 1px solid var(--gray-100); }
    .nav-inner { width: 100%; max-width: 1300px; margin: 0 auto; padding: 0 2.5rem; display: flex; justify-content: space-between; align-items: center; }
    .nav-links { display: flex; gap: 2.5rem; align-items: center; }
    .nav-links a { text-decoration: none; color: var(--primary); font-weight: 700; font-size: 0.85rem; letter-spacing: 0.05em; transition: color 0.2s; }
    .nav-links a:hover { color: var(--accent); }
    .btn-nav { background: var(--primary); color: white !important; padding: 0.75rem 1.5rem; border-radius: 50px; display: flex; align-items: center; gap: 0.5rem; }

    .hero-premium { position: relative; padding: 160px 0 100px; overflow: hidden; min-height: 90vh; display: flex; align-items: center; }
    .hero-visual-bg { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
    .gradient-sphere { position: absolute; border-radius: 50%; filter: blur(100px); opacity: 0.4; }
    .sphere-1 { width: 600px; height: 600px; background: var(--accent-light); top: -200px; right: -100px; }
    .sphere-2 { width: 400px; height: 400px; background: var(--primary-light); bottom: -100px; left: -100px; }
    .grid-overlay { position: absolute; inset: 0; background-image: radial-gradient(circle at 2px 2px, var(--gray-100) 1px, transparent 0); background-size: 40px 40px; opacity: 0.5; }

    .hero-container { display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 4rem; align-items: center; position: relative; z-index: 1; }
    .premium-badge { display: inline-flex; align-items: center; gap: 0.75rem; background: var(--gray-50); padding: 0.5rem 1.25rem; border-radius: 50px; font-size: 0.7rem; font-weight: 800; color: var(--primary); border: 1px solid var(--gray-100); margin-bottom: 2rem; }
    .gold-dot { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 10px var(--accent); }
    .hero-premium h1 { font-size: 4.5rem; line-height: 1.1; font-weight: 900; margin-bottom: 1.5rem; letter-spacing: -0.02em; }
    .gold-text { color: var(--accent); }
    .hero-subtext { font-size: 1.25rem; color: var(--gray-500); line-height: 1.6; margin-bottom: 3rem; max-width: 600px; }
    .hero-cta-group { display: flex; gap: 1.5rem; }

    .hero-image-scene { position: relative; display: flex; justify-content: center; }
    .floating-dashboard { padding: 1.5rem; width: 300px; transform: rotate(-5deg); animation: float 6s infinite ease-in-out; }
    .dash-head { display: flex; gap: 6px; margin-bottom: 1.5rem; }
    .dash-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dash-dot.red { background: #ff5f56; }
    .dash-dot.yellow { background: #ffbd2e; }
    .dash-dot.green { background: #27c93f; }
    .dash-stat { margin-bottom: 1rem; }
    .dash-chart { display: flex; align-items: flex-end; gap: 4px; height: 40px; margin-top: 1rem; }
    .dash-chart .bar { flex: 1; background: var(--primary); border-radius: 2px; }

    .floating-card-mockup { position: absolute; top: 40%; right: -20px; transform: rotate(15deg); animation: float 6s infinite ease-in-out reverse; }
    .mock-card { width: 240px; height: 150px; border-radius: 16px; padding: 1.5rem; position: relative; box-shadow: var(--shadow-lg); }
    .mock-chip { width: 40px; height: 30px; background: #e0e0e0; border-radius: 6px; margin-bottom: 1rem; }
    .mock-logo { position: absolute; bottom: 1.5rem; right: 1.5rem; font-weight: 900; color: rgba(255,255,255,0.8); letter-spacing: 2px; font-size: 0.8rem; }

    .trust-bar { background: var(--gray-50); padding: 2rem 0; border-bottom: 1px solid var(--gray-100); }
    .trust-label { font-size: 0.7rem; font-weight: 800; color: var(--gray-400); letter-spacing: 0.1em; }
    .trust-logos { display: flex; gap: 3rem; }
    .trust-item { font-size: 0.75rem; font-weight: 800; color: var(--gray-500); }

    .features-section { padding: 120px 0; background: white; }
    .section-center-head { text-align: center; max-width: 700px; margin: 0 auto 5rem; }
    .section-center-head h2 { font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem; }
    .section-center-head p { color: var(--gray-500); font-size: 1.1rem; }

    .features-matrix { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; }
    .feature-tile { padding: 3rem; background: var(--gray-50); border-radius: 24px; border: 1px solid transparent; transition: all 0.3s; cursor: pointer; }
    .feature-tile:hover { background: white; border-color: var(--accent); transform: translateY(-10px); box-shadow: var(--shadow-lg); }
    .tile-icon-box { width: 60px; height: 60px; background: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm); }
    .feature-tile h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 1rem; color: var(--primary); }
    .feature-tile p { color: var(--gray-500); font-size: 0.9rem; line-height: 1.6; margin-bottom: 2rem; }
    .tile-footer { border-top: 1px solid var(--gray-200); pt: 1.5rem; }
    .learn-more { font-size: 0.7rem; font-weight: 900; color: var(--accent); letter-spacing: 0.1em; }

    .security-showcase { padding: 120px 0; background: var(--primary); color: white; overflow: hidden; }
    .security-grid-premium { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
    .security-info-text h2 { font-size: 3rem; font-weight: 900; margin-bottom: 1.5rem; }
    .security-info-text p { font-size: 1.1rem; color: var(--gray-300); margin-bottom: 3rem; }
    .security-points { display: flex; flex-direction: column; gap: 2rem; }
    .point-item { display: flex; gap: 1.5rem; }
    .point-icon { width: 32px; height: 32px; background: var(--accent); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; flex-shrink: 0; }
    .point-content h4 { font-size: 1.1rem; font-weight: 800; margin-bottom: 0.5rem; }
    .point-content p { font-size: 0.9rem; color: var(--gray-400); margin-bottom: 0; }

    .security-visual-card { background: rgba(255,255,255,0.05); padding: 4rem; border-radius: 40px; border: 1px solid rgba(255,255,255,0.1); text-align: center; position: relative; }
    .vault-icon { font-size: 5rem; margin-bottom: 2rem; }
    .encryption-lines { display: flex; flex-direction: column; gap: 10px; align-items: center; margin-bottom: 2rem; }
    .encryption-lines .line { height: 4px; background: var(--accent); border-radius: 2px; opacity: 0.3; }
    .security-status { font-size: 0.75rem; font-weight: 900; color: var(--accent); letter-spacing: 0.2em; }

    .final-cta { padding: 120px 0; background: var(--gray-50); }
    .final-cta h2 { font-size: 3rem; font-weight: 900; margin-bottom: 1.5rem; }
    .final-cta p { font-size: 1.25rem; color: var(--gray-500); }

    .premium-footer { background: var(--primary); color: white; padding: 100px 0 40px; }
    .footer-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 3rem; margin-bottom: 4rem; }
    .footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4rem; }
    .footer-col h5 { font-size: 0.8rem; font-weight: 900; color: var(--accent); letter-spacing: 0.2em; margin-bottom: 2rem; }
    .footer-col a { display: block; color: var(--gray-400); text-decoration: none; margin-bottom: 1rem; font-size: 0.9rem; transition: color 0.2s; }
    .footer-col a:hover { color: white; }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 2rem; margin-top: 4rem; text-align: center; font-size: 0.7rem; color: var(--gray-600); letter-spacing: 0.1em; }

    @keyframes float { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-20px) rotate(-3deg); } }
    @media (max-width: 1100px) {
      .hero-premium h1 { font-size: 3.5rem; }
      .hero-container { grid-template-columns: 1fr; text-align: center; }
      .hero-text-content { display: flex; flex-direction: column; align-items: center; }
      .hero-cta-group { justify-content: center; }
      .hero-image-scene { display: none; }
      .features-matrix { grid-template-columns: 1fr 1fr; }
      .security-grid-premium { grid-template-columns: 1fr; }
    }
    @media (max-width: 768px) {
      .hero-premium h1 { font-size: 2.75rem; }
      .features-matrix { grid-template-columns: 1fr; }
      .nav-links a:not(.btn-nav) { display: none; }
      .footer-grid { grid-template-columns: 1fr; gap: 2rem; text-align: center; }
    }
  `]
})
export class LandingComponent {
  features = [
    { key: 'transfer', title: 'Virements instantanés', desc: 'Envoyez de l\'argent en quelques secondes avec vérification OTP. Simple, groupé ou permanent.' },
    { key: 'card', title: 'Gestion de cartes', desc: 'Liez, activez et gérez vos cartes bancaires directement depuis votre espace client.' },
    { key: 'credit', title: 'Simulation de crédit', desc: 'Calculez vos mensualités et soumettez votre demande de crédit en ligne.' },
    { key: 'bot', title: 'Assistant intelligent', desc: 'Notre chatbot IA répond à vos questions et vous guide dans toutes vos opérations.' },
    { key: 'repeat', title: 'Virements permanents', desc: 'Programmez des virements récurrents qui s\'exécutent automatiquement.' },
    { key: 'dashboard', title: 'Tableau de bord', desc: 'Visualisez vos comptes, transactions et cartes en un coup d\'oeil.' },
  ];
  onFeatureClick(title: string) {
    console.log('Feature clicked:', title);
  }
}
