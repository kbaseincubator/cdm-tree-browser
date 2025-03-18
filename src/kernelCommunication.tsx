// Based on https://github.com/jupyterlab/extension-examples/blob/main/kernel-messaging

import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  SessionContext
  // SessionContextDialogs
} from '@jupyterlab/apputils';
import { useEffect, useState } from 'react';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import { IOutput } from '@jupyterlab/nbformat';

// Creates and initializes a sessionContext for use with a kernel
export const useSessionContext = (app: JupyterFrontEnd) => {
  const [sc, setSc] = useState<SessionContext | undefined>();
  useEffect(() => {
    const manager = app.serviceManager;
    const sessionContext = new SessionContext({
      sessionManager: manager.sessions,
      specsManager: manager.kernelspecs,
      name: 'cdm-tree-browser'
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
        console.error(`Failed to initialize the session.\n${reason}`);
      });
    return () => {
      sessionContext.dispose();
      setSc(undefined);
    };
  }, [app.shell.id]);
  return sc;
};

// Executes a kernel query in a given sessionContext
export const queryKernel = async (
  code: string,
  sessionContext: SessionContext
) => {
  const kernel = sessionContext?.session?.kernel;
  if (!kernel) {
    throw new Error('kernel DNE');
  }
  const future: Kernel.IFuture<
    KernelMessage.IExecuteRequestMsg,
    KernelMessage.IExecuteReplyMsg
  > = kernel.requestExecute({ code });
  const output = await new Promise<IOutput>(resolve => {
    future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      const msgType = msg.header.msg_type;
      switch (msgType) {
        case 'execute_result':
        case 'display_data':
        case 'update_display_data':
          resolve(msg.content as IOutput);
          break;
        default:
          break;
      }
    };
  });

  future.dispose();

  return output;
};
