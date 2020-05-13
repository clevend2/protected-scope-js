import { Logger, varLogRep } from '../console/logger';

/**
 * What someone might call a circular, doubly-linked temporal LRU cache
 */

const CACHE_SIZE = 10;

const CACHE_LIFETIME = 10000;

function createNode(key, data = {}) {
  const node = {
    key,
    data,
    right: null,
    left: null,
    lastAccessed: 0,
    dirty: false,
  };

  return node;
}
function insertLeft(ptr, key, data) {
  const newNode = createNode(key, data);

  if (ptr) {
    newNode.right = ptr;
    newNode.left = ptr.left;

    ptr.left.right = newNode;
    ptr.left = newNode;
  } else {
    newNode.left = newNode;
    newNode.right = newNode;
  }

  return newNode;
}

function remove(ptr) {
  if (ptr.right && ptr.left) {
    ptr.right.left = ptr.left;
    ptr.left.right = ptr.right;
  } else {
    ptr.right = null;
    ptr.left = null;
  }
}

function setInvalid(ptr) {
  if (ptr) {
    ptr.dirty = true;
  }
}

function setValid(ptr) {
  if (ptr) {
    ptr.dirty = false;
  }
}

export class mapCache {
  constructor(
    name = 'cache',
    maxSize = CACHE_SIZE,
    lifetime = CACHE_LIFETIME,
    compareFunc = (a, b) => a === b
  ) {
    this.name = name;

    this.logger = new Logger(`cache(${name})`, 'font-weight: bold');

    this.logger.enabled = false;

    this.logger.log(`[initing]`);

    this.maxSize = maxSize;

    this.size = 0;

    this.lifetime = lifetime;

    this.compareFunc = compareFunc;

    this.init();
  }

  init() {
    this.insertion = null;

    this.dirty;
  }

  *traverse(dir, start = this.insertion) {
    const traversalPointers = {},
      dirs = dir ? [dir] : ['left', 'right'],
      dirsNum = dirs.length;

    let count = 0,
      currentDir,
      previous;

    if (start) {
      dirs.forEach((dir) => {
        traversalPointers[dir] = start[dir];
      });

      count++;

      yield start;

      while (true) {
        currentDir = dirs[count % dirsNum];

        if (
          traversalPointers[currentDir] === previous ||
          traversalPointers[currentDir] === start
        ) {
          break;
        }

        yield traversalPointers[currentDir];

        previous = traversalPointers[currentDir];

        traversalPointers[currentDir] =
          traversalPointers[currentDir][currentDir];

        count++;
      }
    }
  }

  getSize() {
    let size = 0;

    size += [...this.traverse('left')].length;

    return size;
  }

  getPointerRep(pointer) {
    if (pointer) {
      return varLogRep(pointer.key);
    }

    return '(null)';
  }

  setLatestAccess(pointer) {
    this.latestAccessed = pointer;

    this.latestAccessed.lastAccessed = Date.now();
  }

  getLatestAccess() {
    return this.latestAccessed;
  }

  // print() {
  //   let table = {},
  //     latestAccessTime = 0,
  //     now = Date.now(),
  //     currentType,
  //     hasPointers = false;

  //   for (const pointer of this.traverse('right')) {
  //     hasPointers = true;

  //     currentType = '';

  //     if (pointer === this.insertion) {
  //       currentType = 'insertion';
  //     }

  //     table[this.getPointerRep(pointer)] = {
  //       right: this.getPointerRep(pointer.right),
  //       left: this.getPointerRep(pointer.left),
  //       type: currentType,
  //       lastAccessed: pointer.lastAccessed,
  //     };

  //     if (!latestAccessTime || pointer.lastAccessed > latestAccessTime) {
  //       latestAccessTime = pointer.lastAccessed;
  //     }
  //   }

  //   for (let key in table) {
  //     table[key]['validation age'] = `${now - table[key].lastAccessed} (${
  //       latestAccessTime - table[key].lastAccessed
  //     })`;

  //     delete table[key].lastAccessed;
  //   }

  //   if (hasPointers) {
  //     this.logger.table(table);
  //   } else {
  //     this.logger.log('empty');
  //   }
  // }

  get(key) {
    let traversals = 0;

    const logNamespace = this.logger.namespace(`[get ${varLogRep(key)}]`);

    logNamespace.log('getting...');

    for (const pointer of this.traverse(['left', 'right'], this.insertion)) {
      if (this.compareFunc(key, pointer.key)) {
        setValid(pointer);

        this.insertion = pointer;

        this.setLatestAccess(pointer);

        logNamespace.logStyle(
          'color: green; font-weight: bold',
          `hit after ${traversals} traversals`,
          this.getPointerRep(pointer)
        );

        return pointer.data;
      }

      traversals++;
    }

    logNamespace.logStyle('color: red; font-weight: bold', 'miss');

    return null;
  }

  set(key, data) {
    const logNamespace = this.logger.namespace(
      `[set ${varLogRep(key)} ${varLogRep(data)}]`
    );

    logNamespace.log('setting...');

    this.insertion = insertLeft(this.insertion, key, data);

    logNamespace.log('inserted @', this.getPointerRep(this.insertion));

    this.setLatestAccess(this.insertion);

    if (this.size + 1 > this.maxSize) {
      remove(this.insertion.left);

      logNamespace.log(
        'oversized, removing @ left of insertion pointer',
        this.getPointerRep(this.insertion.left)
      );
    } else {
      this.size++;
    }

    this.setValidating();

    logNamespace.log('done.');

    return true;
  }

  validate() {
    let now = Date.now();

    const logNamespace = this.logger.namespace('[validation]');

    logNamespace.log('starting...');

    logNamespace.log('before:');

    //this.print();

    for (let pointer of this.traverse('left', this.insertion.left)) {
      if (now - pointer.lastAccessed > this.lifetime) {
        if (pointer === this.getLatestAccess()) {
          this.init();

          logNamespace.log(
            'resetting cache, latest entry is expired @',
            this.getPointerRep(pointer)
          );

          break;
        } else if (pointer === this.insertion) {
          this.insertion = null;

          logNamespace.log(
            'removing expired entry and resetting insertion pointer @',
            this.getPointerRep(pointer)
          );
        } else {
          logNamespace.log(
            'removing expired entry @',
            this.getPointerRep(pointer)
          );
        }

        setInvalid(pointer);
      } else {
        if (
          !this.insertion ||
          pointer.lastAccessed > this.insertion.lastAccessed
        ) {
          this.insertion = pointer;
          logNamespace.log(
            'setting new insertion pointer @',
            this.getPointerRep(pointer)
          );
        }
      }
    }

    logNamespace.log('after:');

    //this.print();

    this.size = this.getSize();

    if (!this.size) {
      this.setValidating(false);
    }

    logNamespace.log('done.');
  }

  setValidating(bool = true) {
    if (bool) {
      if (!this.validationPoll) {
        this.logger.log('[validation poll start]');

        this.validationPoll = setInterval(
          this.validate.bind(this),
          this.lifetime / 2
        );
      }
    } else {
      if (this.validationPoll) {
        this.logger.log('[validation poll ended]');

        clearInterval(this.validationPoll);
      }
    }
  }
}
