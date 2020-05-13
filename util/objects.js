const DESCRIPTOR_KEYS = [
  'writable',
  'configurable',
  'get',
  'set',
  'value',
  'enumerable',
];

export const RESERVED_CLASS_STATIC_PROPS = ['prototype', 'name', 'length'];

export const RESERVED_CLASS_PROTOTYPE_PROPS = ['constructor'];

/**
 * Duck types an object to see if it is a property descriptor
 *
 * @export
 * @param {object} obj
 * @returns {boolean}
 */
export function isDescriptor(obj) {
  if (typeof obj === 'object') {
    return Object.keys(obj).every((key) => DESCRIPTOR_KEYS.includes(key));
  }

  return false;
}

const uidCounters = new WeakMap(),
  UID = Symbol('uid');

export function fullId(obj) {
  return `${getClassName(getInstanceClass(obj))}#${uid(obj)}`;
}

export function uid(obj) {
  if (!obj[UID]) {
    const Class = getInstanceClass(obj);

    let counter = uidCounters.get(Class);

    if (!counter) {
      counter = 0;
    }

    uidCounters.set(Class, ++counter);

    Object.defineProperty(obj, UID, {
      value: counter,
    });
  }

  return obj[UID];
}

export function isClass(obj) {
  return Boolean(obj.prototype);
}

export function getClassName(Class) {
  return Class.name;
}

export function getInstanceClass(instance) {
  return instance.constructor;
}

export function getPropDescriptors(obj, exclude) {
  const props = Object.getOwnPropertyDescriptors(obj);

  for (let prop in props) {
    if (exclude.includes(prop)) {
      delete props[prop];
    }
  }

  return props;
}

export function getClassParent(Class) {
  // note that Object.getPrototypeOf delivers the prototype of the class (its parent)
  // and NOT the prototype of an instance of the class.
  const parent = Object.getPrototypeOf(Class);

  if (parent && getClassName(parent)) {
    return parent;
  }

  return null;
}

/**
 * This is to wrap classes so they implement the interface for an internal promise
 *
 * @export
 * @param {object} Class
 * @param {function} promiseGetter
 */
export const Thenable = (Class = class {}, promiseGetter) => {
  return class extends Class {
    then(onFulfilled, onRejected) {
      const promise = promiseGetter.call(this);

      if (promise) {
        const action = promise.then(onFulfilled, onRejected);
        return action;
      }

      return null;
    }

    catch(onRejected) {
      const promise = promiseGetter.call(this);

      if (promise) {
        const action = promise.catch(onRejected);

        return action;
      }

      return null;
    }

    finally(onFinally) {
      const promise = promiseGetter.call(this);

      if (promise) {
        const action = promise.finally(onFinally);

        return action;
      }

      return null;
    }
  };
};

/**
 * Vue utilities
 */
export function getComponentName(vm) {
  return vm.$vnode.tag;
}
