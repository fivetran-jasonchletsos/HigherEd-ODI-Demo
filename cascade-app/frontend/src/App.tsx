import { HashRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import EnrollmentPage from './pages/EnrollmentPage';
import SuccessPage from './pages/SuccessPage';
import ResearchPage from './pages/ResearchPage';
import ArchitecturePage from './pages/ArchitecturePage';
import PipelinePage from './pages/PipelinePage';
import PolicyPage from './pages/PolicyPage';
import AboutPage from './pages/AboutPage';
import ProgramsPage from './pages/ProgramsPage';
import ProgramDetailPage from './pages/ProgramDetailPage';
import RelatedPage from './pages/RelatedPage';
import NotFoundPage from './pages/NotFoundPage';
import DbtWizardPage from './pages/DbtWizardPage';
import WizardScenarioPage from './pages/WizardScenarioPage';
import WizardLivePage from './pages/WizardLivePage';
import WizardOutcomePage from './pages/WizardOutcomePage';
import ActivationLivePage from './pages/ActivationLivePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="/enrollment" element={<EnrollmentPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/research" element={<ResearchPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/programs" element={<ProgramsPage />} />
            <Route path="/programs/:id" element={<ProgramDetailPage />} />
            <Route path="/related" element={<RelatedPage />} />
            <Route path="/dbt-wizard" element={<DbtWizardPage />} />
            <Route path="/dbt-wizard/scenario" element={<WizardScenarioPage />} />
            <Route path="/dbt-wizard/live" element={<WizardLivePage />} />
            <Route path="/dbt-wizard/outcome" element={<WizardOutcomePage />} />
            <Route path="/activations-live" element={<ActivationLivePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </QueryClientProvider>
  );
}
