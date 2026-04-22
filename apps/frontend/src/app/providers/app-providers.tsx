import { BrowserRouter } from 'react-router-dom';

import AppRouter from '../router/app-router';

export const AppProviders = () => {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
};

export default AppProviders;