import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider, useStore } from './state/StoreContext';
import { TabLayout } from './components/Layout';
import { PlayScreen } from './screens/PlayScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { CaseScreen } from './screens/CaseScreen';
import { GroupsScreen } from './screens/GroupsScreen';

/** Applies theme and text size to <html>, following the OS when theme is "system". */
function Appearance() {
  const { store } = useStore();
  const { theme, textSize } = store.settings;
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#2a0c10' : '#5c0d14');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
  useEffect(() => {
    document.documentElement.classList.toggle('text-small', textSize === 'small');
    document.documentElement.classList.toggle('text-large', textSize === 'large');
  }, [textSize]);
  return null;
}

export function App() {
  return (
    <StoreProvider>
      <Appearance />
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route element={<TabLayout />}>
            <Route path="/play" element={<PlayScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/groups" element={<GroupsScreen />} />
          </Route>
          <Route path="/case/:id" element={<CaseScreen />} />
          <Route path="*" element={<Navigate to="/play" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
