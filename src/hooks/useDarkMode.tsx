
import { DarkModeContext } from '../context/DarkModeContext';

import { useContext } from 'react';


export const useDarkMode = () => {
  return useContext(DarkModeContext);
};

