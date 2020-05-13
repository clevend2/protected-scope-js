import {
  getClassName,
  getComponentName,
  fullId,
  isClass,
} from '../util/objects';

const logFunctions = ['log', 'warn', 'error'];

export class Logger {
  constructor(title, titleStyle) {
    this.inGroup = 0;

    this.buffered = new Array();

    this.title = title;

    this.titleStyle = titleStyle;

    this.enabled = true;

    this.autoTitle = true;

    this.console = console;

    this.callerDepth = 4;
  }

  appendTitle(logFunc, logs, style) {
    if (this.enabled) {
      if (!this.inGroup) {
        logs.unshift(
          `%c${this.title}` + (this.autoTitle ? this.getCaller() : ''),
          style || this.titleStyle
        );
      }

      return logFunc(...logs);
    }

    return null;
  }

  logStyle(style, ...logs) {
    return this.appendTitle(this.console.log, logs, style);
  }

  buffer(...logs) {
    this.buffered = this.buffered.concat(logs);
  }

  flush(...logs) {
    this.log(...this.buffered.concat(logs));

    this.buffered = new Array();
  }

  namespace(...nameSpaceLogs) {
    const self = this;

    return {
      log(...logs) {
        return self.log(...nameSpaceLogs.concat(logs));
      },
      logStyle(style, ...logs) {
        return self.logStyle(style, ...nameSpaceLogs.concat(logs));
      },
    };
  }

  group(...logs) {
    this.inGroup++;
    if (this.enabled) {
      this.console.group(...logs);
    }
  }

  groupCollapsed(...logs) {
    this.inGroup++;
    if (this.enabled) {
      this.console.groupCollapsed(...logs);
    }
  }

  groupEnd() {
    this.inGroup--;
    if (this.enabled) {
      this.console.groupEnd();
    }
  }

  table(...args) {
    if (this.enabled) {
      this.console.table(...args);
    }
  }

  getCaller(depth) {
    depth = depth || this.callerDepth;

    // get the stack
    const stack = new Error().stack;

    return `::${stack.split('\n')[depth].trim()}`;
  }
}

logFunctions.forEach((func) => {
  Logger.prototype[func] = function (...logs) {
    this.appendTitle(this.console[func], logs);
  };
});

export function varLogRep(mixed) {
  return ['object', 'function'].indexOf(typeof mixed) > -1
    ? fullId(mixed)
    : mixed;
}

// function getModuleName (importMeta) {
//     if (!importMeta) {
//         return '!NO_MODULE_META_PROVIDED!'
//     } else {
//         return importMeta.url.split('/').pop()
//     }
// }

/**
 * The base level logging factory to wrap the console
 */

function getStringTitle(title) {
  return title || '_logger';
}

function getComponentTitle(vm) {
  return getComponentName(vm);
}

function getObjectTitle(object) {
  return isClass(object) ? getClassName(object) : varLogRep(object);
}

export const logWrapper = {
  get enabled() {
    return window.debug ? window.debug.log : false;
  },
  varLogRep,
  loggers: {
    _logger: new Logger(''),
  },

  loggableTypes: {
    String: {
      titleFunc: getStringTitle,
    },
    VueComponent: {
      titleFunc: getComponentTitle,
      defaultStyle: 'color: green; font-family: monospace',
    },
    Object: {
      titleFunc: getObjectTitle,
      defaultStyle: 'color: blue; font-style: italic',
    },
  },

  getLoggableType(loggable) {
    if (loggable) {
      if (
        loggable.constructor &&
        loggable.constructor.name === 'VueComponent'
      ) {
        return this.loggableTypes['VueComponent'];
      } else if (loggable instanceof Object) {
        return this.loggableTypes['Object'];
      }
    }

    return this.loggableTypes['String'];
  },

  setLogger(loggable, titleStyle) {
    const loggableType = this.getLoggableType(loggable);

    if (loggableType) {
      titleStyle = titleStyle || loggableType.defaultStyle;

      const title = loggableType.titleFunc(loggable);

      if (!this.loggers[title]) {
        this.loggers[title] = new Logger(title, titleStyle);
      }

      this.loggers[title].enabled = this.enabled;

      return this.loggers[title];
    }

    return false;
  },

  getLogger(loggable) {
    const loggableType = this.getLoggableType(loggable);

    if (loggableType) {
      const title = loggableType.titleFunc(loggable);

      if (!this.loggers[title]) {
        return this.setLogger(loggable);
      }

      return this.loggers[title];
    }

    return false;
  },

  toggle(loggable) {
    let logger = this.getLogger(loggable);

    if (logger) {
      logger.enabled = !logger.enabled;
    }
  },

  disableAll() {
    window.$_log = false;

    this.loggers['_logger'].enabled = false;

    for (let title in this.loggers) {
      this.loggers[title].enabled = false;
    }
  },
};

Object.getOwnPropertyNames(Logger.prototype).forEach((func) => {
  if (func !== 'constructor' && typeof Logger.prototype[func] === 'function') {
    logWrapper[func] = function (loggable, ...args) {
      if (!loggable) {
        throw new Error(
          'You must specify a namespace, object or component for the logger as the 1st argument.'
        );
      }

      let logger = logWrapper.getLogger(loggable);

      // increase caller depth since we're adding a stack item
      logger.callerDepth++;

      logger[func](...args);

      logger.callerDepth--;

      // add trace as well
      if (logger.enabled) {
        logger.console.groupCollapsed('trace:');
        logger.console.trace();
        logger.console.groupEnd();
      }
    };
  }
});
