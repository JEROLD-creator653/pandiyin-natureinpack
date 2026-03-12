const badges = [
  { logo: '/Quality_Assured.png', text: 'Quality Assured' },
  { logo: '/zero_preservatives.png', text: '0% Preservatives' },
  { logo: '/zero_chemicals.png', text: 'Zero Chemicals' },
  { logo: '/Natural.png', text: '100% Natural' },
  { logo: '/FSSAI.png', text: 'FSSAI Approved' },
];

export default function TrustBadges() {
  const duplicated = [...badges, ...badges];

  return (
    <>
      <style>{`
        @keyframes trust-marquee {
          0%   { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }

        .trust-wrapper {
          overflow: hidden;
          width: 100%;
          background: #fff;
          height: 100px;
        }

        .trust-track {
          display: flex;
          align-items: center;
          width: max-content;
          gap: calc((100vw - 3 * 220px) / 3);
          height: 100%;
          will-change: transform;
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          animation: trust-marquee 30s linear infinite;
          padding: 0 calc((100vw - 3 * 220px) / 6);
        }

        .trust-badge {
          display: flex;
          align-items: center;
          gap: 16px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .trust-badge-logo {
          width: 95px;
          height: 95px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          background: #fff;
        }

        .trust-badge-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          border-radius: 50%;
        }

        .trust-badge-text {
          font-size: 15px;
          font-weight: 500;
          color: #6B7280;
          letter-spacing: 0.3px;
        }

        @media (max-width: 768px) {
          .trust-track {
            gap: calc((100vw - 3 * 160px) / 3);
            padding: 0 calc((100vw - 3 * 160px) / 6);
          }
          .trust-badge-logo {
            width: 70px;
            height: 70px;
          }
          .trust-badge-text {
            font-size: 13px;
          }
        }
      `}</style>

      <section className="trust-wrapper">
        <div className="trust-track">
          {duplicated.map((badge, i) => (
            <div key={i} className="trust-badge">
              <div className="trust-badge-logo">
                <img
                  src={badge.logo}
                  alt={badge.text}
                  width={95}
                  height={95}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="trust-badge-text">{badge.text}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
