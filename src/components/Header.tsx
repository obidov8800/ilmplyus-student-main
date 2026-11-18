import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LanguageSelect from './LanguageSelect/LanguageSelect';
import adminImg from '../assets/images/admin-img.svg';
import { useTranslation } from 'react-i18next';
import useAuthStore from '../store/useAuthStore';
import { useAccount } from '../services/account';

const Header = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const logoutRef = useRef<HTMLDivElement>(null);

  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitles: Record<string, string> = {
    '/': t('header.controlPanel'),
    '/student-exams': t('header.test'),
    '/student-courses': t('header.courses'),
    '/student-attendance': t('header.attendance'),
    '/profile': t('header.profile'),
  };

  // Ism va rol — yagona hisob servisidan (`services/account.ts`): talaba ma'lumoti va ruxsatlari `/me` dan BIR marta
  // olinadi (store'ni ham servis yangilaydi), profil/davomat/kurslar sahifalari ham shu so'rovdan foydalanadi.
  // Uzun ism sig'masin: familiya to'liq, qolgan so'zlar bosh harfi bilan; to'liq ism — sichqoncha ustida.
  const { account } = useAccount();

  const title = pageTitles[pathname] ?? t('header.controlPanel');

  return (
    <header>
      <div className="header-left">
        <h1>{title}</h1>
        <form
          className="header-left-form"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder={t('registration.inputPlaceholder')} />
        </form>
      </div>

      <div className="header-right">
        <div className="header-right-buttons">
          <LanguageSelect />
          <button className="notification-btn">
            <i className="fa-solid fa-bell"></i>
          </button>
          <button className="chat-btn">
            <i className="fa-regular fa-message"></i>
          </button>
        </div>

        <div
          className={`header-right-admin ${showLogout ? 'active' : ''}`}
          onClick={() => setShowLogout(!showLogout)}
          ref={logoutRef}
        >
          <div style={{ textAlign: 'right' }}>
            <h1 title={account?.fullName}>{account?.shortName}</h1>
            <h3>{account?.roleName || 'Student'}</h3>
          </div>
          <div className="header-right-admin-card">
            <img src={adminImg} alt="admin avatar" />
          </div>

          {showLogout && (
            <div className="logout-dropdown">
              <button
                className="logout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogout(false);
                  navigate('/profile');
                }}
              >
                <i className="fa-solid fa-user"></i>
                <span>{t('header.profile')}</span>
              </button>
              <button onClick={handleLogout} className="logout-btn">
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>{t('header.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
