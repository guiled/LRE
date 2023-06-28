// Types found on https://stackoverflow.com/a/55468194
type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;
type Constructor<T = {}> = new (...args: any[]) => T;
/* turns A | B | C into A & B & C */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;
/* merges constructor types - self explanitory */
type MergeConstructorTypes<
  T extends Array<Constructor<any> | AbstractConstructor<any>>
> = UnionToIntersection<InstanceType<T[number]>>;
function applyToConstructor(constructor: Constructor, argArray: any[]) {
  const factoryFunction = constructor.bind.apply(constructor, [
    null,
    ...argArray,
  ]);
  return new factoryFunction();
}

var Mixin = function <T extends (Constructor | AbstractConstructor)[]>(
  ...mixins: T
): Constructor<MergeConstructorTypes<T>> {
  const getProps = (obj: any) => {
    let currentObj = obj;
    const prototypes = [];
    const properties: Record<string, any> = {};
    do {
      prototypes.unshift(currentObj);
    } while (
      (currentObj = Object.getPrototypeOf(currentObj)) &&
      currentObj.constructor.name !== "Object"
    );
    prototypes.forEach((prototype) => {
      Object.getOwnPropertyNames(prototype).forEach(
        (property) =>
          (properties[property] = [
            prototype,
            Object.getOwnPropertyDescriptor(prototype, property),
          ])
      );
    });
    return properties;
  };

  //const supers: Record<string, Record<string, (...args: any[]) => any>> = {};

  const MixinSuperClass: Constructor<MergeConstructorTypes<T>> = class {
    private supers: Record<string, Record<string, (...args: Array<Array<any>>) => any>> =
      {};
    //#supers: Array<() => void>;
    constructor(args: Record<string, Array<unknown>>) {
      const prototype = Object.getPrototypeOf(this);
      const thisProps = Object.getOwnPropertyDescriptors(prototype);
      mixins.forEach((mixinMember, index) => {
        this.supers[mixinMember.name] = {};
        const mixinMemberInstance = applyToConstructor(
          mixinMember as Constructor,
          args?.[index] || []
        );
        const mixinMemberProps = getProps(mixinMemberInstance);
        const mixinMemberPrototype = Object.getPrototypeOf(mixinMemberInstance);
        Object.keys(mixinMemberProps)
          .filter((prop) => prop !== "constructor")
          .forEach((prop) => {
            const [o, descriptor] = mixinMemberProps[prop];
            //console.log(`add ${prop} to supers for ${Mixin.name}`)
            if (typeof descriptor.value === "function") {
              this.supers[mixinMember.name][prop] =
                descriptor.value.bind(mixinMemberInstance);
            } else {
              this.supers[mixinMember.name][prop] = descriptor;
            }
            if (thisProps[prop]) {
              (mixinMemberInstance as Record<string, any>)[prop] = (
                this as Record<string, any>
              )[prop].bind(this);
            }
          });
      });
    }
  } as Constructor<MergeConstructorTypes<T>>;

  mixins.forEach((Mixin) => {
    const props = getProps(Mixin.prototype);
    Object.keys(props).forEach(
      (prop) =>
        (MixinSuperClass.prototype[prop] = function () {
          return this.supers[Mixin.name][prop].apply(
            this,
            Array.from(arguments)
          );
        })
    );
  });

  return MixinSuperClass;
};

export { Mixin };
