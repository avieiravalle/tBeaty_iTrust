import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClientView } from './ClientView';
import { AdminView } from './AdminView';
import { LandingView } from './LandingView';

type View = 'landing' | 'client' | 'admin';

export const App = () => {
  const [view, setView] = useState<View>('landing');
  const [initialRegister, setInitialRegister] = useState(false);

  const renderView = () => {
    switch (view) {
      case 'client':
        return <ClientView onBack={() => setView('landing')} initialRegister={initialRegister} />;
      case 'admin':
        return <AdminView onBack={() => setView('landing')} initialRegister={initialRegister} />;
      case 'landing':
      default:
        return (
          <LandingView
            onClientClick={() => { setInitialRegister(false); setView('client'); }}
            onClientRegisterClick={() => { setInitialRegister(true); setView('client'); }}
            onAdminClick={() => { setInitialRegister(false); setView('admin'); }}
            onAdminRegisterClick={() => { setInitialRegister(true); setView('admin'); }}
          />
        );
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderView()}
      </motion.div>
    </AnimatePresence>
  );
};