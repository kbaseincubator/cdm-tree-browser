import { INotebookTracker, NotebookActions } from '@jupyterlab/notebook';

/**
 * Inserts a code cell with the specified content into the active notebook.
 * The cell is inserted below the currently active cell.
 *
 * @param notebookTracker - The notebook tracker from JupyterLab
 * @param code - The code to insert into the new cell
 * @returns true if the cell was inserted successfully, false otherwise
 */
export function insertCodeCell(
  notebookTracker: INotebookTracker | null,
  code: string
): boolean {
  if (!notebookTracker) {
    console.warn('No notebook tracker available');
    return false;
  }

  const current = notebookTracker.currentWidget;
  if (!current) {
    console.warn('No active notebook');
    return false;
  }

  const notebook = current.content;

  // Insert a new cell below the active cell
  NotebookActions.insertBelow(notebook);

  // Set the content of the new cell using the shared model API (JupyterLab 4.x)
  const activeCell = notebook.activeCell;
  if (activeCell) {
    activeCell.model.sharedModel.setSource(code);
    return true;
  }

  return false;
}
