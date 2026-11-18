import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/useAuthStore';
import StudentExamsPage from './pages/student-exams';
import StudentExamPage from './pages/student-exam';
import StudentCoursesPage from './pages/student-courses';
import StudentAttendancePage from './pages/student-attendance';
import ProfilePage from './pages/profile';
import LoginPage from './pages/login';
import ContractConfirmPage from './pages/contract-confirm';

import './index.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const App = () => {
  const isAuth = useAuthStore((state) => state.isAuth);

  return (
    <Routes>
      {/*
       * Ochiq (auth talab qilmaydigan) shartnoma tasdiqlash sahifasi — SMS'dagi
       * qisqa link (`/c/{short_code}`) backendda `/contract/{hash_link}`ga
       * yo'naltiriladi. `ProtectedRoute`dan TASHQARIDA turishi shart — aks
       * holda login qilinmagan foydalanuvchi (deyarli hammasi, chunki link
       * o'zi hali tizimga kirmagan ota-ona/o'quvchiga yuboriladi) avtomatik
       * login sahifasiga uzatilib qolardi (aynan shu bug bo'lgan edi).
       * `/contract/view/:hash` — admin panel bilan bir xil eski moslik yo'li.
       */}
      <Route path="/contract/:hash" element={<ContractConfirmPage />} />
      <Route path="/contract/view/:hash" element={<ContractConfirmPage />} />

      <Route
        path="/login"
        element={isAuth ? <Navigate to="/student-exams" replace /> : <LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/student-exams" replace />} />
          <Route path="/student-exams" element={<StudentExamsPage />} />
          <Route path="/student-exam/:sessionId" element={<StudentExamPage />} />
          <Route path="/student-courses" element={<StudentCoursesPage />} />
          <Route path="/student-attendance" element={<StudentAttendancePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/student-exams" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
