import { useState } from 'react';

interface SendOtpRequest {
  To: string;
  Name: string;
}

interface VerifyOtpRequest {
  To: string;
  Code: string;
}

export default function LoginPage() {
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:8081/oauth2/authorization/google';
  //http://localhost:8081/oauth2/authorization/google
    //http://localhost:8081/login/oauth2/code/google
  };

  const sendOtp = async () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!mobile.trim()) {
      alert('Please enter your mobile number');
      return;
    }

    try {
      const payload: SendOtpRequest = {
        To: mobile,
        Name: name,
      };

      const response = await fetch('http://localhost:8082/api/otp/send-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        alert(data.message || 'Unable to send OTP');
        return;
      }

      alert('OTP has been sent');
      setStep('otp');
    } catch (error) {
      console.error(error);
      alert('Unable to send OTP');
    }
  };

  const verifyOtp = async () => {
    if (!mobile.trim()) {
      alert('Please enter your mobile number');
      return;
    }

    if (!otp.trim()) {
      alert('Please enter the OTP');
      return;
    }

    try {
      const payload: VerifyOtpRequest = {
        To: mobile,
        Code: otp,
      };

      const response = await fetch('http://localhost:8082/api/otp/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || data.status !== 'success') {
        alert(data.message || 'OTP verification failed');
        return;
      }

      console.log('OTP verified successfully');
      const loggedInUser = {
        fullName: name,
        email: '',
        profileImage: '',
        mobile: mobile,
      };

      localStorage.setItem('jaldiJanaUser', JSON.stringify(loggedInUser));
      alert('Login successful');
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      alert('OTP verification failed');
    }
  };

  return (
    <main className="ride-login-page">
      <style>{`
        .ride-login-page {
          --bg-deep: #07131f;
          --bg-panel: rgba(6, 18, 31, 0.78);
          --panel-border: rgba(148, 163, 184, 0.18);
          --gold: #fbbf24;
          --gold-soft: rgba(251, 191, 36, 0.18);
          --teal: #38bdf8;
          --text: #e5f0ff;
          --muted: #b9c8da;
          --input-bg: rgba(15, 23, 42, 0.7);
          --shadow: 0 28px 60px rgba(2, 6, 23, 0.45);
          min-height: calc(100vh - 72px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 18px;
          background:
            linear-gradient(135deg, rgba(2, 6, 23, 0.7), rgba(8, 28, 43, 0.6)),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1600' height='900' viewBox='0 0 1600 900'%3E%3Cg fill='none' stroke='%2359b3d8' stroke-width='4' opacity='0.5'%3E%3Cpath d='M-100 580 L420 480 L650 520 L980 420 L1400 470 L1720 380'/%3E%3Cpath d='M180 150 L880 250 L1120 170 L1500 210'/%3E%3Cpath d='M250 820 L480 680 L760 760 L1040 620 L1340 720'/%3E%3Cpath d='M120 190 L120 760 M430 100 L430 820 M780 120 L780 870 M1160 90 L1160 830 M1450 170 L1450 830'/%3E%3C/g%3E%3Cg fill='%23dfeaf8' font-family='Arial, sans-serif'%3E%3Ctext x='410' y='470' font-size='84' font-weight='700' fill='%23dfeaf8' opacity='0.9'%3EBIHAR%3C/text%3E%3Ctext x='1050' y='280' font-size='52' fill='%23cfe7ff' opacity='0.9'%3EPATNA%3C/text%3E%3Ctext x='1010' y='640' font-size='44' fill='%23cfe7ff' opacity='0.8'%3EGAYA%3C/text%3E%3C/g%3E%3Cg stroke='%23c7d2fe' stroke-width='3' opacity='0.44'%3E%3Cpath d='M0 200 H1600 M0 360 H1600 M0 520 H1600 M0 680 H1600 M0 840 H1600 M380 0 V900 M760 0 V900 M1140 0 V900'/%3E%3C/g%3E%3C/svg%3E");
          background-size: cover;
          background-position: center;
        }

        .ride-login-container {
          width: min(1120px, 100%);
          min-height: 650px;
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          background: rgba(8, 17, 29, 0.78);
          border: 1px solid var(--panel-border);
          border-radius: 30px;
          overflow: hidden;
          backdrop-filter: blur(10px);
          box-shadow: var(--shadow);
        }

        .ride-login-hero {
          position: relative;
          padding: 42px 40px;
          background: linear-gradient(135deg, rgba(2, 6, 23, 0.2), rgba(14, 116, 144, 0.1));
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .ride-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          width: fit-content;
          padding: 10px 16px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: var(--text);
          font-weight: 700;
        }

        .ride-brand-mark {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          font-size: 1.05rem;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: #0f172a;
        }

        .ride-hero-copy {
          max-width: 500px;
          margin-top: 50px;
        }

        .ride-hero-copy h1 {
          margin: 0 0 14px;
          font-size: clamp(2.5rem, 3vw, 4rem);
          line-height: 1.05;
          color: #fff;
        }

        .ride-hero-copy p {
          margin: 0;
          color: var(--muted);
          font-size: 1.08rem;
          line-height: 1.75;
        }

        .ride-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 30px;
        }

        .ride-badge {
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(15, 23, 42, 0.66);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #d9ebff;
          font-size: 0.92rem;
          font-weight: 600;
        }

        .ride-login-panel {
          padding: 34px 30px;
          background: rgba(8, 17, 29, 0.82);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ride-login-card {
          width: 100%;
          max-width: 380px;
          padding: 24px 0 0;
        }

        .ride-login-card h2 {
          margin: 0 0 12px;
          font-size: 2rem;
          color: #fff;
        }

        .ride-login-card p {
          margin: 0 0 24px;
          color: var(--muted);
        }

        .ride-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .ride-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ride-field label {
          color: #d7e8ff;
          font-weight: 600;
        }

        .ride-field input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 14px;
          background: var(--input-bg);
          color: #f8fbff;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .ride-field input:focus {
          border-color: rgba(56, 189, 248, 0.8);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
        }

        .ride-primary-btn,
        .ride-google-btn {
          border: none;
          border-radius: 14px;
          padding: 15px 18px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.2s ease;
        }

        .ride-primary-btn {
          background: linear-gradient(135deg, #fbbf24, #f97316);
          color: #111827;
        }

        .ride-google-btn {
          background: rgba(15, 23, 42, 0.8);
          color: #f8fbff;
          border: 1px solid rgba(148, 163, 184, 0.2);
        }

        .ride-primary-btn:hover,
        .ride-google-btn:hover {
          transform: translateY(-1px);
          opacity: 0.98;
        }

        .ride-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--muted);
          margin: 6px 0 2px;
        }

        .ride-divider::before,
        .ride-divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        }

        .ride-meta {
          margin-top: 18px;
          text-align: center;
          color: var(--muted);
          font-size: 0.9rem;
        }

        .ride-meta a {
          color: #7dd3fc;
          font-weight: 700;
          text-decoration: none;
        }

        @media (max-width: 860px) {
          .ride-login-container {
            grid-template-columns: 1fr;
          }

          .ride-login-hero {
            min-height: 260px;
            padding-bottom: 28px;
          }

          .ride-login-panel {
            padding-top: 0;
          }
        }
      `}</style>

      <div className="ride-login-container">
        <section className="ride-login-hero">
          <div className="ride-brand">
            <span className="ride-brand-mark">J</span>
            Jaldi Jana
          </div>

          <div className="ride-hero-copy">
            <h1>Ride faster. Ride smarter.</h1>
            <p>
              Book bikes and scooties across Bihar in minutes with secure login, fast pickups,
              and transparent pricing.
            </p>

            <div className="ride-badges">
              <span className="ride-badge">⚡ Quick bookings</span>
              <span className="ride-badge">💸 ₹10/km</span>
              <span className="ride-badge">🛵 City rides</span>
            </div>
          </div>
        </section>

        <section className="ride-login-panel">
          <div className="ride-login-card">
            <h2>Welcome back</h2>
            <p>Sign in to continue your ride.</p>

            <form className="ride-form" onSubmit={(event) => event.preventDefault()}>
              <div className="ride-field">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="ride-field">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value)}
                />
              </div>

              {step === 'otp' && (
                <div className="ride-field">
                  <label htmlFor="otp">OTP</label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value)}
                  />
                </div>
              )}

              {step === 'login' ? (
                <button type="button" className="ride-primary-btn" onClick={sendOtp}>
                  Get OTP
                </button>
              ) : (
                <button type="button" className="ride-primary-btn" onClick={verifyOtp}>
                  Verify OTP
                </button>
              )}

              <div className="ride-divider">or</div>

              <button type="button" className="ride-google-btn" onClick={loginWithGoogle}>
                Continue with Google
              </button>
            </form>

            <div className="ride-meta">
              New rider? <a href="http://localhost:8080/api/auth/createuser">Create account</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
