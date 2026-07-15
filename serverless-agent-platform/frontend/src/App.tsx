import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Runs } from './pages/Runs';
import { Agents } from './pages/Agents';
import { SubmitTask } from './pages/SubmitTask';
import { Settings } from './pages/Settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="runs" element={<Runs />} />
          <Route path="agents" element={<Agents />} />
          <Route path="agents/:agentId" element={<Agents />} />
          <Route path="submit" element={<SubmitTask />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
