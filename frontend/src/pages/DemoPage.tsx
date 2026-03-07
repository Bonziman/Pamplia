import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DemoPage.css';

const WHATSAPP_NUMBER = '212600000000';
const WHATSAPP_TEXT = encodeURIComponent(
  "Bonjour, je suis interesse par Pamplia pour mon salon a Casablanca. Je veux une demo et une activation en 48h."
);
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_TEXT}`;

const DemoPage: React.FC = () => {
  useEffect(() => {
    const previousTitle = document.title;
    const previousDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

    document.title = 'Demo Pamplia | Activation salon en 48h a Casablanca';

    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute(
        'content',
        'Demo Pamplia pour salons premium a Casablanca: reservation elegante, rappels anti no-show, gestion equipe et clients. Activation en 48h.'
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
    <div className="demo-root">
      <header className="demo-nav">
        <Link to="/" className="demo-brand">Pamplia</Link>
        <div className="demo-nav-actions">
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="demo-btn demo-btn-primary">
            WhatsApp
          </a>
          <Link to="/login" className="demo-btn demo-btn-ghost">Connexion</Link>
        </div>
      </header>

      <main>
        <section className="demo-hero">
          <div className="demo-copy">
            <p className="demo-kicker">Casablanca | Salons premium</p>
            <h1>Demarrez en 48h avec une experience de reservation haut de gamme.</h1>
            <p>
              Pamplia vous aide a remplir votre agenda, reduire les no-shows et offrir une image premium
              a vos clientes, sans complexite technique.
            </p>
            <div className="demo-actions">
              <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="demo-btn demo-btn-primary">
                Recevoir une demo sur WhatsApp
              </a>
              <Link to="/book" className="demo-btn demo-btn-ghost">Tester la reservation</Link>
            </div>
            <ul className="demo-bullets">
              <li>Configuration complete sous 48h</li>
              <li>Paiement manuel cash ou virement</li>
              <li>Support direct en francais</li>
            </ul>
          </div>

          <div className="demo-visual">
            <img
              src="/landing/hero-product.svg"
              alt="Apercu produit Pamplia en situation"
              loading="eager"
            />
            <div className="demo-chip chip-a">Activation en 48h</div>
            <div className="demo-chip chip-b">No-show en baisse</div>
          </div>
        </section>

        <section className="demo-section">
          <h2>Ce que vous obtenez des la premiere semaine</h2>
          <div className="demo-grid demo-grid-3">
            <article className="demo-card stagger-1">
              <h3>Page de reservation premium</h3>
              <p>Une page claire et elegante pour convertir vos visites en rendez-vous confirms.</p>
            </article>
            <article className="demo-card stagger-2">
              <h3>Rappels automatiques</h3>
              <p>Des rappels structures pour reduire les absences et proteger votre chiffre.</p>
            </article>
            <article className="demo-card stagger-3">
              <h3>Dashboard exploitable</h3>
              <p>Vision immediate des rendez-vous, equipe, clientes et performances.</p>
            </article>
          </div>
        </section>

        <section className="demo-section demo-offer">
          <h2>Offre de lancement Casablanca</h2>
          <div className="demo-grid demo-grid-2">
            <article className="demo-plan">
              <p className="plan-name">Mise en place</p>
              <p className="plan-price">A partir de 499 MAD</p>
              <p>Parametrage initial, branding, services, equipe, disponibilites.</p>
            </article>
            <article className="demo-plan">
              <p className="plan-name">Abonnement mensuel</p>
              <p className="plan-price">A partir de 199 MAD / mois</p>
              <p>Hebergement, maintenance, support et evolutions continues.</p>
            </article>
          </div>
          <p className="demo-note">
            Paiement flexible: cash, virement bancaire ou PayPal.
          </p>
        </section>

        <section className="demo-section demo-shots">
          <h2>Apercus produit Pamplia</h2>
          <div className="demo-grid demo-grid-3">
            <figure className="demo-shot stagger-1">
              <img
                src="/landing/screen-booking.svg"
                alt="Capture produit booking public"
                loading="lazy"
              />
              <figcaption>Capture ecran booking public</figcaption>
            </figure>
            <figure className="demo-shot stagger-2">
              <img
                src="/landing/screen-planning.svg"
                alt="Capture produit planning equipe"
                loading="lazy"
              />
              <figcaption>Capture ecran planning equipe</figcaption>
            </figure>
            <figure className="demo-shot stagger-3">
              <img
                src="/landing/screen-dashboard.svg"
                alt="Capture produit dashboard admin"
                loading="lazy"
              />
              <figcaption>Capture ecran dashboard admin</figcaption>
            </figure>
          </div>
        </section>

        <section className="demo-final">
          <h2>Prete a passer en mode premium ?</h2>
          <p>Envoyez un message et recevez un plan de demarrage adapte a votre salon.</p>
          <div className="demo-actions">
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="demo-btn demo-btn-primary">
              Demander ma demo WhatsApp
            </a>
            <Link to="/" className="demo-btn demo-btn-ghost">Retour accueil</Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DemoPage;
