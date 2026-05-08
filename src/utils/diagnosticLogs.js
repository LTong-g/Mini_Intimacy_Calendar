import { NativeModules, Platform } from 'react-native';
import rejectionTracking from 'promise/setimmediate/rejection-tracking';

const { DiagnosticLogModule } = NativeModules;

const isNativeDiagnosticLogAvailable = () =>
  Platform.OS === 'android' && Boolean(DiagnosticLogModule);

const normalizeError = (error) => {
  if (error instanceof Error) {
    return {
      message: error.message || error.name || 'Unknown error',
      stack: error.stack || null,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      stack: null,
    };
  }

  try {
    return {
      message: JSON.stringify(error),
      stack: null,
    };
  } catch {
    return {
      message: String(error),
      stack: null,
    };
  }
};

export const hasDiagnosticLogs = async () => {
  if (!isNativeDiagnosticLogAvailable()) return false;
  return DiagnosticLogModule.hasLogs();
};

export const openDiagnosticLogFolder = async () => {
  if (!isNativeDiagnosticLogAvailable()) return false;
  return DiagnosticLogModule.openLogFolder();
};

export const recordDiagnosticProblem = (source, error) => {
  if (!isNativeDiagnosticLogAvailable()) return false;
  const normalized = normalizeError(error);
  if (typeof DiagnosticLogModule.recordProblemSync === 'function') {
    return DiagnosticLogModule.recordProblemSync(
      source,
      normalized.message,
      normalized.stack
    );
  }
  return false;
};

export const installDiagnosticLogHandlers = () => {
  if (!isNativeDiagnosticLogAvailable()) return;

  const errorUtils = global.ErrorUtils;
  const previousGlobalHandler = errorUtils?.getGlobalHandler?.();
  if (errorUtils?.setGlobalHandler && !global.__diagnosticLogGlobalHandlerInstalled) {
    global.__diagnosticLogGlobalHandlerInstalled = true;
    errorUtils.setGlobalHandler((error, isFatal) => {
      if (isFatal) {
        recordDiagnosticProblem('js-fatal-exception', error);
      }
      previousGlobalHandler?.(error, isFatal);
    });
  }

  if (!__DEV__ && !global.__diagnosticLogPromiseTrackingInstalled) {
    global.__diagnosticLogPromiseTrackingInstalled = true;
    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (id, rejection) => {
        recordDiagnosticProblem(
          'js-unhandled-promise-rejection',
          rejection || `Unhandled promise rejection ${id}`
        );
      },
      onHandled: () => {},
    });
  }

  const trackingTarget = globalThis;
  if (
    typeof trackingTarget.addEventListener === 'function' &&
    !global.__diagnosticLogPromiseHandlerInstalled
  ) {
    global.__diagnosticLogPromiseHandlerInstalled = true;
    trackingTarget.addEventListener('unhandledrejection', (event) => {
      recordDiagnosticProblem(
        'js-unhandled-promise-rejection',
        event?.reason || 'Unhandled promise rejection'
      );
    });
  }
};
