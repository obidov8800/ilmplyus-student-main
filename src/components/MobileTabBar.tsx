import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './MobileTabBar.css';

/**
 * Telefon/planshet (≤768px) uchun ekran pastidagi tezkor navigatsiya paneli —
 * admin/user ilovalaridagi (`ilmplyus-main`) `MobileTabBar` bilan bir xil
 * "suzuvchi panel" dizayni, shu bilan ilova "mobil ilovadek" tuyuladi.
 *
 * O'quvchi ilovasida atigi 4 ta bo'lim bor va ular hammaga (bitta "student"
 * roliga) bir xil — shuning uchun admin versiyasidagi ruxsat bo'yicha
 * filtrlash/6 tagacha cheklash mantig'i kerak emas: barcha 4 tasi doim
 * ko'rsatiladi. `Aside` esa mobil ekranda butunlay yashiriladi (`index.css`).
 */
const TABS = [
  { to: '/student-exams', icon: 'fa-list-check', labelKey: 'mobileNav.tests' },
  { to: '/student-courses', icon: 'fa-graduation-cap', labelKey: 'mobileNav.courses' },
  { to: '/student-attendance', icon: 'fa-user-check', labelKey: 'mobileNav.attendance' },
  { to: '/profile', icon: 'fa-user', labelKey: 'mobileNav.profile' },
];

const MobileTabBar = () => {
  const { t } = useTranslation();

  return (
    <nav className="mobile-tabbar" aria-label={t('mobileNav.title')}>
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `mobile-tabbar__item${isActive ? ' is-active' : ''}`}
        >
          <i className={`fa-solid ${tab.icon}`} aria-hidden="true" />
          <span>{t(tab.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default MobileTabBar;
