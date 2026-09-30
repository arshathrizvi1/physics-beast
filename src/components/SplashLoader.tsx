'use client';
import { useEffect, useState } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';

export default function SplashLoader() {
  const [loading, setLoading] = useState(true);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    SplashScreen.hide().catch(() => {});
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15;
      if (current > 95) current = 95;
      setPercent(current);
    }, 100);

    const timeout = setTimeout(() => {
      setPercent(100);
      setTimeout(() => setLoading(false), 300);
    }, 2800);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  if (!loading) return null;

  return (
    <>
      <style>{\
        .splash-screen {
          position: fixed;
          inset: 0;
          overflow: hidden;
          background: radial-gradient(circle at 50% 48%, rgba(80, 55, 15, 0.22), transparent 38%), linear-gradient(135deg, #020202 0%, #090806 48%, #020202 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          z-index: 999999;
        }
        .logo-area {
          width: min(65vw, 350px);
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(1vh);
          z-index: 5;
        }
        .academy-logo {
          width: 100%;
          height: auto;
          display: block;
          border-radius: 20%;
          filter: drop-shadow(0 0 14px rgba(255, 190, 50, .20)) drop-shadow(0 0 35px rgba(255, 170, 30, .08));
        }
        .tagline {
          margin-top: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          font-family: Arial, sans-serif;
          font-size: clamp(10px, 2.8vw, 15px);
          letter-spacing: .38em;
          color: #e6b94c;
          white-space: nowrap;
        }
        .tagline b {
          font-size: 9px;
          color: #f5d57b;
          letter-spacing: 0;
        }
        .loader {
          position: relative;
          width: min(58vw, 330px);
          height: 7px;
          margin-top: 42px;
          border: 1px solid rgba(190, 135, 35, .75);
          border-radius: 999px;
          background: rgba(30, 20, 5, .85);
          overflow: hidden;
          box-shadow: inset 0 0 5px rgba(0,0,0,.9), 0 0 10px rgba(210,155,45,.08);
        }
        .loader-fill {
          position: absolute;
          inset: 0 auto 0 0;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #b87812, #ffd86a 45%, #fff1a9 52%, #e6a72d);
          box-shadow: 0 0 8px rgba(255, 196, 60, .9), 0 0 20px rgba(255, 170, 20, .45);
          transition: width 0.1s ease;
        }
        .loader-fill::after {
          content: "";
          position: absolute;
          top: 0;
          right: -50px;
          width: 50px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent);
          filter: blur(2px);
          animation: shine 1.1s linear infinite;
        }
        .gold-curve {
          position: absolute;
          width: 125%;
          height: 35%;
          border: 2px solid rgba(218, 157, 44, .65);
          border-left: 0;
          border-bottom: 0;
          border-radius: 50%;
          pointer-events: none;
          filter: drop-shadow(0 0 5px rgba(255,180,40,.25));
        }
        .curve-top {
          top: -23%;
          left: -48%;
          transform: rotate(-23deg);
        }
        .curve-bottom {
          bottom: -23%;
          right: -48%;
          transform: rotate(-23deg);
        }
        @keyframes shine {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(100px); }
        }
      \}</style>
      <div className="splash-screen">
        <div className="gold-curve curve-top"></div>
        <div className="gold-curve curve-bottom"></div>
        <div className="logo-area">
          <img src="/logo.jpg" alt="Brilliant Academy" className="academy-logo" />
          <div className="tagline">
            <span>LEARN</span>
            <b>â€¢</b>
            <span>GROW</span>
            <b>â€¢</b>
            <span>ACHIEVE</span>
          </div>
          <div className="loader">
            <div className="loader-fill" style={{ width: \\%\ }}></div>
          </div>
        </div>
      </div>
    </>
  );
}
