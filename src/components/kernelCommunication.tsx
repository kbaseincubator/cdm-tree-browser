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

const KERNEL_NAME = 'python3';
const KERNEL_START_TIMEOUT_MS = 60000;

/** Creates and initializes a sessionContext for use with a kernel */
export const useSessionContext = (app: JupyterFrontEnd) => {
  const [sc, setSc] = useState<SessionContext | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [isConnecting, setIsConnecting] = useState(true);

  useEffect(() => {
    const manager = app.serviceManager;
    let sessionContext: SessionContext | undefined;
    let disposed = false;

    const initSession = async () => {
      try {
        // Wait for kernelspecs to be ready
        await manager.kernelspecs.ready;

        // Check if python3 kernelspec exists
        const specs = manager.kernelspecs.specs;
        if (!specs || !specs.kernelspecs[KERNEL_NAME]) {
          const available = specs
            ? Object.keys(specs.kernelspecs).join(', ')
            : 'none';
          throw new Error(
            `Kernel '${KERNEL_NAME}' not found. ` +
            `Available: ${available}`
          );
        }

        sessionContext = new SessionContext({
          sessionManager: manager.sessions,
          specsManager: manager.kernelspecs,
          name: SESSION_NAME
        });

        const needsKernel = await sessionContext.initialize();

        if (disposed) return;

        if (needsKernel) {
          // Start kernel with timeout
          const kernelPromise = sessionContext.changeKernel({
            name: KERNEL_NAME
          });

          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(
                `Timeout starting kernel after ` +
                `${KERNEL_START_TIMEOUT_MS / 1000}s`
              ));
            }, KERNEL_START_TIMEOUT_MS);
          });

          await Promise.race([kernelPromise, timeoutPromise]);
        }

        if (disposed) return;

        // Monitor for kernel death and auto-reconnect
        const kernel = sessionContext.session?.kernel;
        if (kernel) {
          const onStatusChange = async () => {
            if (disposed) return;
            if (kernel.status === 'dead') {
              console.warn('Kernel died, attempting to reconnect...');
              setIsConnecting(true);
              try {
                await sessionContext.changeKernel({ name: KERNEL_NAME });
                if (!disposed) {
                  setError(undefined);
                  console.log('Kernel reconnected successfully');
                }
              } catch (reconnectError) {
                if (!disposed) {
                  setError(new Error('Kernel died and reconnection failed'));
                  console.error('Failed to reconnect kernel:', reconnectError);
                }
              } finally {
                if (!disposed) {
                  setIsConnecting(false);
                }
              }
            }
          };
          kernel.statusChanged.connect(onStatusChange);
        }

        setSc(sessionContext);
      } catch (reason) {
        if (disposed) return;
        const message = reason instanceof Error
          ? reason.message
          : String(reason);
        setError(new Error(message));
        console.error('Failed to initialize kernel session:', reason);
      } finally {
        if (!disposed) {
          setIsConnecting(false);
        }
      }
    };

    initSession();

    return () => {
      disposed = true;
      sessionContext?.dispose();
      setSc(undefined);
      setError(undefined);
      setIsConnecting(true);
    };
  }, [app.serviceManager]);

  return { sessionContext: sc, error, isConnecting };
};

/** Wait for kernel to be ready (idle status) */
const waitForKernelReady = async (
  kernel: Kernel.IKernelConnection,
  timeoutMs: number = 30000
): Promise<void> => {
  const readyStatuses = ['idle'];
  const badStatuses = ['dead', 'unknown'];

  if (readyStatuses.includes(kernel.status)) {
    return;
  }

  if (badStatuses.includes(kernel.status)) {
    throw new KernelError(
      `Kernel is in ${kernel.status} state`
    );
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new KernelError(
        `Timeout waiting for kernel to be ready (status: ${kernel.status})`
      ));
    }, timeoutMs);

    const onStatusChanged = () => {
      if (readyStatuses.includes(kernel.status)) {
        clearTimeout(timeoutId);
        kernel.statusChanged.disconnect(onStatusChanged);
        resolve();
      } else if (badStatuses.includes(kernel.status)) {
        clearTimeout(timeoutId);
        kernel.statusChanged.disconnect(onStatusChanged);
        reject(new KernelError(
          `Kernel entered ${kernel.status} state`
        ));
      }
    };

    kernel.statusChanged.connect(onStatusChanged);
  });
};

/** Executes a kernel query in a given sessionContext */
export const queryKernel = async (
  code: string,
  sessionContext: SessionContext
): Promise<{ data?: IOutput; error?: KernelError }> => {
  const kernel = sessionContext?.session?.kernel;
  if (!kernel) {
    return { error: new KernelError('Jupyter kernel is not available') };
  }

  // Wait for kernel to be ready before executing
  try {
    await waitForKernelReady(kernel);
  } catch (error) {
    return {
      error: error instanceof KernelError
        ? error
        : new KernelError('Failed to connect to kernel')
    };
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
          case 'stream': {
            // Log print() output for debugging
            const streamContent = msg.content as {
              name: 'stdout' | 'stderr';
              text: string;
            };
            if (streamContent.name === 'stderr') {
              console.warn('Kernel stderr:', streamContent.text);
            } else {
              console.debug('Kernel stdout:', streamContent.text);
            }
            break;
          }
          case 'error':
            if (!hasResolved) {
              hasResolved = true;
              const errorContent = msg.content as {
                ename: string;
                evalue: string;
                traceback?: string[];
              };
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
