# Protected Scope for JS Classes
This is an explorational project I took on personally back in 2018 to utilize Weakmaps to create a private (and protected) visibility level for Javascript Classes (or constructors in general). With official standards on the horizon and such things as typescript, I don't know that, even optimized and robustly tested, this would be of use. It did however exercise some deeper JS muscles. 
 
### MAIN CONCEPTS / TIERS OF STORAGE:

#### 1. Class <=> Protected Class:

-The declarative portion of the system.

-A protected class is generated for any Class which is injected into $_.declare().

-A singleton Map remains in memory to relate each and every $_.declare'd class
 to its protected counterpart.

-Prototype inheritance of protected classes match the public Class
 so long as the parents of the public Class have also been $.declare'd with
 protected scope.

 (
 Note that the "parent" of a given Protected Class is determined by
 tracing up the prototype chain of the public Class until another
 protected class -- if any -- is found.

 This means given a chain of inheritance MySuperClass => MyParentClass => MyChildClass:

 ` $.declare(MySuperClass)
 ` ... // skipping MyParentClass ...
 ` $.declare(MyChildClass)

 the resulting Protected Class for MyChildClass will directly inherit from
 that of the MySuperClass -- skipping the MyParentClass since no $.declare was performed.
 )

#### 2. Class Instance <=> Protected Instance:

-The initialized portion of the system.

-Using the Class map in the previous tier,
 a instance of the corresponding Protected Class is
 automatically instantiated when first invoking $_()
 on an instance of a given Class.

 (
 Note that a protected instance is not created until "used"
 by invoking $_() on a public Class instance, and it is immediately destroyed
 upon destruction / garbage collection of the public instance... unless you
 save the protected instance object/properties somewhere else -- don't do that!
 )

#### 3. Protected Accessor for Protected Instances -- or, using $_(<Class Instance>) to get at the corresponding <Protected Instance>

-The accessing portion of the system
 (since it can't happen on the previous tier -- that's the problem we're trying to address!)

-When a Protected Instance is created, the next step is for a Protected Accessor
 to be created that allows for getting and setting in the Protected Instance
 through the black box of a private function scope.

-Accessors are cached with a specific (weird) Time-sensitive LRU algorithm meant to handle
 bursty accesses where the same instance or family of instances are accessed in temporal locality
 and then no longer needed.
