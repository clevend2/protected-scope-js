import {
  getClassParent,
  RESERVED_CLASS_PROTOTYPE_PROPS,
  RESERVED_CLASS_STATIC_PROPS,
} from './util/objects';
import { findProtectedProps, extractProtectedProps } from './protected-props';

// this is here to allow the class to have a "name," but a *technically* unique one so it doesn't pollute namespace
const baseClassSymbol = Symbol('base protected scope class');

const baseProtectedScopeClassFactory = () => {
  const uselessContainer = {
    // here we return a new object with the symbol as a property key to contain the class.
    // Very hacky but it works!
    [baseClassSymbol]: class {
      constructor(classInstance) {
        // filter out the protected props from the instance and assign them
        // to the protected instance
        Object.assign(this, findProtectedProps(classInstance));
      }
    },
  };

  // now the class returns with a symbol as its "name"
  return uselessContainer[baseClassSymbol];
};

// Contains a mapping from each public Class to its corresponding Protected Class
export const protectedScopeClassMap = new Map();

export function findProtectedScopeClass(Class) {
  let currentClass = Class,
    protectedScopeClass = null;

  if (Class) {
    do {
      protectedScopeClass = protectedScopeClassMap.get(currentClass);

      if (protectedScopeClass) {
        return protectedScopeClass;
      }

      currentClass = getClassParent(currentClass);
    } while (currentClass);
  }

  return false;
}

function createProtectedScopeClass(Class) {
  let protectedScopeClass;

  // see if there exists a parent class -- and thus a corresponding protected
  // parent class -- so chaining in the protected scope is maintained
  const protectedParentScopeClass = findProtectedScopeClass(
    getClassParent(Class)
  );

  // apply chaining if necessary
  if (protectedParentScopeClass) {
    protectedScopeClass = class extends protectedParentScopeClass {};
  } else {
    protectedScopeClass = baseProtectedScopeClassFactory();
  }

  // then try to extract the protected props from the class declaration
  let protectedInstanceProps;
  let protectedStaticProps;
  try {
    protectedInstanceProps = extractProtectedProps(
      Class.prototype,
      RESERVED_CLASS_PROTOTYPE_PROPS
    );

    protectedStaticProps = extractProtectedProps(
      Class,
      RESERVED_CLASS_STATIC_PROPS
    );
  } catch (e) {
    // the properties are not valid or configurable
  }

  // finish building the protected scope class
  Object.defineProperties(
    protectedScopeClass.prototype,
    protectedInstanceProps
  );

  Object.defineProperties(protectedScopeClass, protectedStaticProps);

  return protectedScopeClass;
}

export function initProtectedScopeClass(Class) {
  protectedScopeClassMap.set(Class, createProtectedScopeClass(Class));
}
