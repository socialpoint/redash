import { useReducer, useEffect, useRef } from "react";
import location from "@/services/location";
import recordEvent from "@/services/recordEvent";
import { ExecutionStatus } from "@/services/query-result";
import notifications from "@/services/notifications";
import useImmutableCallback from "@/lib/hooks/useImmutableCallback";

function getMaxAge() {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'maxAge' does not exist on type 'undefine... Remove this comment to see the full error message
  const { maxAge } = location.search;
  return maxAge !== undefined ? maxAge : -1;
}

const reducer = (prevState: any, updatedProperty: any) => ({
  ...prevState,
  ...updatedProperty,
});

// This is currently specific to a Query page, we can refactor
// it slightly to make it suitable for dashboard widgets instead of the other solution it
// has in there.
export default function useQueryExecute(query: any) {
  const [executionState, setExecutionState] = useReducer(reducer, {
    queryResult: null,
    isExecuting: false,
    loadedInitialResults: false,
    executionStatus: null,
    isCancelling: false,
    cancelCallback: null,
    error: null,
  });

  const queryResultInExecution = useRef(null);
  // Clear executing queryResult when component is unmounted to avoid errors
  useEffect(() => {
    return () => {
      queryResultInExecution.current = null;
    };
  }, []);

  const executeQuery = useImmutableCallback((maxAge = 0, queryExecutor: any) => {
    let newQueryResult: any;
    if (queryExecutor) {
      newQueryResult = queryExecutor();
    } else {
      newQueryResult = query.getQueryResult(maxAge);
    }

    // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
    recordEvent("execute", "query", query.id);
    notifications.getPermissions();

    queryResultInExecution.current = newQueryResult;

    setExecutionState({
      updatedAt: newQueryResult.getUpdatedAt(),
      executionStatus: newQueryResult.getStatus(),
      isExecuting: true,
      cancelCallback: () => {
        // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
        recordEvent("cancel_execute", "query", query.id);
        setExecutionState({ isCancelling: true });
        newQueryResult.cancelExecution();
      },
    });

    const onStatusChange = (status: any) => {
      if (queryResultInExecution.current === newQueryResult) {
        setExecutionState({ updatedAt: newQueryResult.getUpdatedAt(), executionStatus: status });
      }
    };

    newQueryResult
      .toPromise(onStatusChange)
      .then((queryResult: any) => {
        if (queryResultInExecution.current === newQueryResult) {
          // TODO: this should probably belong in the QueryEditor page.
          if (queryResult && queryResult.query_result.query === query.query) {
            query.latest_query_data_id = queryResult.getId();
            query.queryResult = queryResult;
          }

          if (executionState.loadedInitialResults) {
            notifications.showNotification("Redash", `${query.name} updated.`);
          }

          setExecutionState({
            queryResult,
            loadedInitialResults: true,
            error: null,
            isExecuting: false,
            isCancelling: false,
            executionStatus: null,
          });
        }
      })
      .catch((queryResult: any) => {
        if (queryResultInExecution.current === newQueryResult) {
          if (executionState.loadedInitialResults) {
            notifications.showNotification("Redash", `${query.name} failed to run: ${queryResult.getError()}`);
          }

          setExecutionState({
            queryResult,
            loadedInitialResults: true,
            error: queryResult.getError(),
            isExecuting: false,
            isCancelling: false,
            executionStatus: ExecutionStatus.FAILED,
          });
        }
      });
  });

  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    // TODO: this belongs on the query page?
    // loadedInitialResults can be removed if so
    if (queryRef.current.hasResult() || queryRef.current.paramsRequired()) {
      executeQuery(getMaxAge());
    } else {
      setExecutionState({ loadedInitialResults: true });
    }
  }, [executeQuery]);

  return { ...executionState, ...{ executeQuery } };
}
