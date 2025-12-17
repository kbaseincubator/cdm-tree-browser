import { ITreeDataProvider } from '../sharedTypes';
import { berdlProvider } from './berdlProvider';

// Registry of all available data providers
export const dataProviders = [
  berdlProvider
  // ADD NEW PROVIDERS HERE
] as ITreeDataProvider[];

export default dataProviders;
