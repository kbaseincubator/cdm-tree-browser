import { ITreeDataProvider } from '../sharedTypes';
import { cdmProvider } from './cdmProvider';

// Registry of all available data providers
export const dataProviders = [
  cdmProvider
  // ADD NEW PROVIDERS HERE
] as ITreeDataProvider[];

export default dataProviders;