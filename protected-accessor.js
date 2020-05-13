import { mapCache } from './cache/map-cache';
import { getClassName, getClassParent, getInstanceClass } from './util/objects';
import {
  getProtectedInstance,
  setProtectedInstance,
} from './protected-instance';

// Contains a set of caches for each public Class with
// which to cache created accessors
const accessorCache = {
  _classMap: new Map(),
  _fetchClassCache(Class) {
    return this._classMap.get(Class);
  },
  _initClassCache(Class) {
    const cacheId = `_${getClassName(Class)}`;

    accessorCache = new mapCache(cacheId);

    logger.log(
      `initialized accessor cache for class ${getClassName(Class)}: ${cacheId}`,
      {
        protectedAccessor,
        accessorCache,
      }
    );

    this._classMap.set(Class, accessorCache);

    return accessorCache;
  },
  set(classInstance, protectedAccessor) {
    const Class = getInstanceClass(classInstance);

    // try to find the Class-level cache map for the classInstance's class
    const accessorCache =
      this._fetchClassCache(Class) || this._initClassCache(Class);

    accessorCache.set(classInstance, protectedAccessor);
  },
  get(classInstance) {
    const Class = getInstanceClass(classInstance);

    const accessorCache = this._fetchClassCache(Class);

    if (accessorCache) {
      const protectedInstance = accessorCache.get(classInstance);

      logger.log(
        `got protected instance from cache for class ${getClassName(Class)}`,
        classInstance,
        protectedInstance
      );

      return protectedInstance;
    }

    return;
  },
};

function makeDescriptorCache(protectedInstance) {
  let cache = {},
    currentClass = getInstanceClass(protectedInstance);

  do {
    Object.assign(
      cache,
      Object.getOwnPropertyDescriptors(currentClass.prototype)
    );

    currentClass = getClassParent(currentClass);
  } while (currentClass);

  return cache;
}

function getDescriptor(cache, protectedInstance, prop) {
  let descriptor = {};

  // If this is an owned property it is active in the instance, so needs to be checked
  // for its descriptor
  if (protectedInstance.hasOwnProperty(prop)) {
    descriptor = Object.getOwnPropertyDescriptor(protectedInstance, prop);
  } else if (cache[prop]) {
    descriptor = cache[prop];
  }

  return descriptor;
}

function getProtected(descriptorCache, classInstance, protectedInstance, prop) {
  const descriptor = getDescriptor(descriptorCache, protectedInstance, prop);

  if (descriptor.get) {
    return descriptor.get.call(classInstance);
  }

  if (typeof protectedInstance[prop] === 'function' && prop !== 'constructor') {
    return (...args) => protectedInstance[prop].apply(classInstance, args);
  }

  return protectedInstance[prop];
}

function setProtected(
  descriptorCache,
  classInstance,
  protectedInstance,
  prop,
  val
) {
  const descriptor = getDescriptor(descriptorCache, protectedInstance, prop);

  if (descriptor.set) {
    return descriptor.set.call(classInstance, val) !== false;
  }

  protectedInstance[prop] = val;

  return true;
}

function createProtectedAccessor(classInstance) {
  let protectedInstance =
    getProtectedInstance(classInstance) || setProtectedInstance(classInstance);

  const descriptorCache = makeDescriptorCache(protectedInstance);

  const protectedAccessor = new Proxy(protectedInstance, {
    get(protectedInstance, prop) {
      return getProtected(
        descriptorCache,
        classInstance,
        protectedInstance,
        prop
      );
    },
    set(protectedInstance, prop, val) {
      return setProtected(
        descriptorCache,
        classInstance,
        protectedInstance,
        prop,
        val
      );
    },
  });

  logger.log(
    `made new protectedAccessor for class ${getInstanceClass(classInstance)}`,
    classInstance,
    protectedAccessor
  );

  return protectedAccessor;
}

export function getProtectedAccessor(classInstance) {
  return accessorCache.get(classInstance);
}

export function setProtectedAccessor(
  classInstance,
  protectedAccessor = createProtectedAccessor(classInstance)
) {
  // add the accessor for the given instance to the cache
  accessorCache.set(classInstance, protectedAccessor);

  return protectedAccessor;
}
