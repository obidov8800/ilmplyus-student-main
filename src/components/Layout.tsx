import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Aside from './Aside';
import MobileTabBar from './MobileTabBar';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <Aside
        collapsed={collapsed}
        onOpen={() => setCollapsed(false)}
        onClose={() => setCollapsed(true)}
      />

      <div className="layout-main">
        <Header />

        <main className="page">
          <Outlet />
        </main>

        {/* Telefon/planshet uchun pastki tezkor navigatsiya (≤768px).
            Desktop `aside` shu kenglikda yashiriladi (index.css). */}
        <MobileTabBar />
      </div>
    </div>
  );
};

export default Layout;
