import { useEffect } from 'react';
import { SessionContext } from '@jupyterlab/apputils';
import { showSuccess } from '../utils/errorUtil';
import { queryKernel } from '../components/kernelCommunication';

/**
 * Hook to check if CDM methods are using mocks and show a success notification
 */
export function useMockNotification(sessionContext: SessionContext | null) {
  useEffect(() => {
    const checkMockUsage = async () => {
      if (!sessionContext) return;
      
      try {
        const { data, error } = await queryKernel(
          'import cdm_tree_browser; get_db_structure, get_table_schema, using_mocks = cdm_tree_browser.get_cdm_methods(); using_mocks',
          sessionContext
        );

        if (error) {
          console.error('Failed to check mock usage:', error);
          return;
        }

        if (data && data.trim() === 'True') {
          showSuccess('CDM Tree Browser is using mock data');
        }
      } catch (error) {
        console.error('Error checking mock usage:', error);
      }
    };

    checkMockUsage();
  }, [sessionContext]);
}