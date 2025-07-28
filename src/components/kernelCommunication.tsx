// Based on https://github.com/jupyterlab/extension-examples/blob/main/kernel-messaging

import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  SessionContext
  // SessionContextDialogs
} from '@jupyterlab/apputils';
import { useEffect, useState } from 'react';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import { IOutput } from '@jupyterlab/nbformat';

const SESSION_NAME = 'cdm-tree-browser';

export class KernelError extends Error {
  public readonly traceback?: string[];
  public readonly ename?: string;
  public readonly evalue?: string;

  constructor(
    message: string,
    details?: { ename?: string; evalue?: string; traceback?: string[] }
  ) {
    super(message);
    this.name = 'KernelError';
    this.ename = details?.ename;
    this.evalue = details?.evalue;
    this.traceback = details?.traceback;
  }
}

// Creates and initializes a sessionContext for use with a kernel
export const useSessionContext = (app: JupyterFrontEnd) => {
  const [sc, setSc] = useState<SessionContext | undefined>();
  const [error, setError] = useState<Error | undefined>();
  useEffect(() => {
    const manager = app.serviceManager;
    const sessionContext = new SessionContext({
      sessionManager: manager.sessions,
      specsManager: manager.kernelspecs,
      name: SESSION_NAME
    });
    void sessionContext
      .initialize()
      .then(async value => {
        if (value) {
          // const sessionContextDialogs = new SessionContextDialogs({});
          // await sessionContextDialogs.selectKernel(sessionContext); // Show kernel selection dialog
          await sessionContext.changeKernel({ name: 'python3' }); // skip dialog
          setSc(sessionContext);
        }
      })
      .catch(reason => {
        const sessionError = new Error(`Failed to initialize the session: ${reason}`);
        setError(sessionError);
        console.error('Failed to initialize the session:', reason);
      });
    return () => {
      sessionContext.dispose();
      setSc(undefined);
      setError(undefined);
    };
  }, [app.shell.id]);
  return { sessionContext: sc, error };
};

// Executes a kernel query in a given sessionContext
export const queryKernel = async (
  code: string,
  sessionContext: SessionContext
): Promise<{ data?: IOutput; error?: KernelError }> => {
  const kernel = sessionContext?.session?.kernel;
  if (!kernel) {
    return { error: new KernelError('Jupyter kernel is not available') };
  }

  const future: Kernel.IFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > = kernel.requestExecute({ code });

  const result = await new Promise<{ data?: IOutput; error?: KernelError }>(
    resolve => {
      let hasResolved = false;

      future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
        const msgType = msg.header.msg_type;
        switch (msgType) {
          case 'execute_result':
          case 'display_data':
          case 'update_display_data':
            if (!hasResolved) {
              hasResolved = true;
              resolve({ data: msg.content as IOutput });
            }
            break;
          case 'error':
            if (!hasResolved) {
              hasResolved = true;
              const errorContent = msg.content as any;
              const message =
                errorContent.traceback?.join('\n') ||
                `${errorContent.ename}: ${errorContent.evalue}`;
              const error = new KernelError(message, {
                ename: errorContent.ename,
                evalue: errorContent.evalue,
                traceback: errorContent.traceback
              });
              resolve({ error });
            }
            break;
          default:
            break;
        }
      };

      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          resolve({ error: new KernelError('Kernel execution timeout') });
        }
      }, 30000);
    }
  );

  future.dispose();
  return result;
};

export const parseKernelOutputJSON = <ExpectedType,>(
  output?: IOutput
): ExpectedType | undefined => {
  if (
    output?.data &&
    typeof output.data === 'object' &&
    'text/plain' in output.data
  ) {
    try {
      const rawText = output.data['text/plain'] as string;
      const cleanedText = rawText.replace(/^'|'$/g, '');
      return JSON.parse(cleanedText) as ExpectedType;
    } catch (error) {
      console.error('Failed to parse kernel output as JSON:', {
        output,
        error: error instanceof Error ? error.message : error
      });
      return undefined;
    }
  }
  console.warn(
    'Invalid kernel output format - missing text/plain data:',
    output
  );
  return undefined;
};
