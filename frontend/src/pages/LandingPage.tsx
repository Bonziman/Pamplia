import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    document.title = 'Pamplia | Logiciel de reservation premium pour salons a Casablanca';

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        'content',
        'Pamplia aide les salons premium a Casablanca a augmenter leurs reservations, reduire les no-shows et offrir une experience client elegante.'
      );
    }

    return () => {
      document.title = previousTitle;
      if (descriptionMeta) {
        descriptionMeta.setAttribute('content', previousDescription);
      }
    };
  }, []);

  return (
    <div className="lp-root">
      <header className="lp-nav">
        <div className="lp-brand">Pamplia</div>
        <nav className="lp-nav-links" aria-label="Navigation principale">
          <a href="#fonctionnalites">Fonctionnalites</a>
          <a href="#resultats">Resultats</a>
          <a href="#faq">FAQ</a>
          <Link to="/demo">Demo</Link>
          <Link to="/login" className="lp-nav-cta">Connexion</Link>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-hero-copy">
            <p className="lp-kicker">Concu pour les salons premium a Casablanca</p>
            <h1>
              Une experience de reservation
              <span> digne de votre image.</span>
            </h1>
            <p className="lp-subtitle">
              Pamplia centralise reservations, rappels, clients et equipe dans une interface elegante.
              Moins de no-shows, plus de rendez-vous confirmes, plus de fidelisation.
            </p>
            <div className="lp-actions">
              <Link to="/demo" className="lp-btn lp-btn-primary">Demander une demo</Link>
              <Link to="/login" className="lp-btn lp-btn-ghost">Acceder au dashboard</Link>
            </div>
            <ul className="lp-proof">
              <li>Activation manuelle en 48h</li>
              <li>Interface FR orientee mobile</li>
              <li>Rappels automatiques anti no-show</li>
            </ul>
          </div>

          <div className="lp-hero-visual" aria-label="Apercu du produit">
            <img
              src="/landing/hero-product.svg"
              alt="Apercu produit Pamplia avec planning et performance"
              loading="eager"
            />
            <div className="lp-floating-card lp-float-a">
              <strong>+27%</strong>
              <span>de reservations confirmees</span>
            </div>
            <div className="lp-floating-card lp-float-b">
              <strong>-31%</strong>
              <span>de no-shows en moyenne</span>
            </div>
          </div>
        </section>

        <section id="fonctionnalites" className="lp-section">
          <div className="lp-section-head">
            <p className="lp-kicker">Ce qui fait la difference</p>
            <h2>Un systeme pense pour la realite terrain des salons</h2>
          </div>
          <div className="lp-grid lp-grid-3">
            <article className="lp-card stagger-1">
              <h3>Reservation fluide</h3>
              <p>Prise de rendez-vous en quelques tapes, optimisee mobile et disponible 24/7.</p>
            </article>
            <article className="lp-card stagger-2">
              <h3>Gestion clients</h3>
              <p>Historique, tags, notes et suivi personnalise pour augmenter la retention.</p>
            </article>
            <article className="lp-card stagger-3">
              <h3>Pilotage equipe</h3>
              <p>Staff, services, disponibilites et supervision centralisee pour l'admin.</p>
            </article>
          </div>
        </section>

        <section id="resultats" className="lp-section lp-showcase">
          <div className="lp-section-head">
            <p className="lp-kicker">Apercus de l'experience</p>
            <h2>Ce que vos clientes verront, et ce que vous piloterez</h2>
          </div>
          <div className="lp-grid lp-grid-3">
            <figure className="lp-shot stagger-1">
              <img
                src="/landing/screen-booking.svg"
                alt="Capture produit de l'ecran de reservation"
                loading="lazy"
              />
              <figcaption>Ecran de reservation public</figcaption>
            </figure>
            <figure className="lp-shot stagger-2">
              <img
                src="/landing/screen-planning.svg"
                alt="Capture produit du planning equipe"
                loading="lazy"
              />
              <figcaption>Planning et disponibilites</figcaption>
            </figure>
            <figure className="lp-shot stagger-3">
              <img
                src="/landing/screen-dashboard.svg"
                alt="Capture produit du dashboard admin"
                loading="lazy"
              />
              <figcaption>Dashboard admin et performance</figcaption>
            </figure>
          </div>
        </section>

        <section id="faq" className="lp-section lp-faq">
          <div className="lp-section-head">
            <p className="lp-kicker">Questions frequentes</p>
            <h2>Lancement simple, sans complexite</h2>
          </div>
          <div className="lp-grid lp-grid-2">
            <article className="lp-card">
              <h3>Combien de temps pour demarrer ?</h3>
              <p>En general 48h pour configurer votre salon, vos services et votre equipe.</p>
            </article>
            <article className="lp-card">
              <h3>Le systeme est-il adapte au mobile ?</h3>
              <p>Oui, l'interface est optimisee pour smartphone, cote clientes et equipe.</p>
            </article>
          </div>
        </section>

        <section className="lp-cta-band">
          <h2>Offrez une experience premium des aujourd'hui</h2>
          <p>Testez la reservation en direct, puis activez votre espace en quelques minutes.</p>
          <div className="lp-actions">
            <Link to="/demo" className="lp-btn lp-btn-primary">Voir la page demo</Link>
            <Link to="/login" className="lp-btn lp-btn-ghost">Connexion admin</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
