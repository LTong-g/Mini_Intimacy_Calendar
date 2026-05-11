import { createContext, useContext } from 'react';

export const MemoShellContext = createContext(null);

export const useMemoShell = () => {
  const value = useContext(MemoShellContext);
  if (!value) {
    throw new Error('useMemoShell must be used inside MemoShellContext.Provider');
  }
  return value;
};
