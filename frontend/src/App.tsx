import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { MainLayout } from './components/layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { TicketDetails } from './pages/TicketDetails';
import { Settings } from './pages/Settings';
import { History } from './pages/History';
import { Reports } from './pages/Reports';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />

            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="relatorios" element={<Reports />}/>
            
            <Route path="/ticket/:id" element={<TicketDetails />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
