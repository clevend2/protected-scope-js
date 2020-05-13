import { getClassName, getInstanceClass } from './util/objects';

// Contains a mapping from each public Class to WeakMaps,
// which themselves map public instances of that Class
// to their respective protected instances
const protectedInstanceMap = new Map();

function createProtectedInstance(classInstance) {
  const Class = getInstanceClass(classInstance),
    protectedScopeClass = findProtectedScopeClass(Class);

  if (!protectedScopeClass) {
    throw new Error(
      `protected scope could not be found for class ${getClassName(Class)}`
    );
  }

  return new protectedScopeClass(classInstance);
}

export function getProtectedInstance(classInstance) {
  const Class = getInstanceClass(classInstance),
    instanceWeakMap = protectedInstanceMap.get(Class);

  if (instanceWeakMap) {
    return instanceWeakMap.get(classInstance);
  }

  return false;
}

export function setProtectedInstance(
  classInstance,
  protectedInstance = createProtectedInstance(classInstance)
) {
  const Class = getInstanceClass(classInstance);

  let instanceWeakMap = protectedInstanceMap.get(Class);

  if (!instanceWeakMap) {
    instanceWeakMap = new WeakMap();

    protectedInstanceMap.set(Class, instanceWeakMap);
  }

  instanceWeakMap.set(classInstance, protectedInstance);

  return true;
}
