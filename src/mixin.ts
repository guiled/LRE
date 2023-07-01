// Thanks to https://github.com/jcalz  https://stackoverflow.com/a/76585028/762461
type C<A extends any[], R> = abstract new (...args: A) => R

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
/* merges constructor types - self explanitory */
type MergeConstructorTypes<T extends Array<C<any, any>>
> = UnionToIntersection<InstanceType<T[number]>>;

function applyToConstructor(constructor: C<any[], any>, argArray: any[]) {
  const factoryFunction = constructor.bind.apply(constructor as new (...args: any[]) => any, [
    null,
    ...argArray,
  ]);
  return new factoryFunction();
}

type MixinFunction = {
  <A1 extends any[], R1>(
    ctor1: C<A1, R1>
  ): new (...args: any) => R1
  <A1 extends any[], R1, A2 extends any[], R2>(
    ctor1: C<A1, R1>, ctor2: C<A2, R2>
  ): new (...args: any) => R1 & R2
  <A1 extends any[], R1, A2 extends any[], R2, A3 extends any[], R3>(
    ctor1: C<A1, R1>, ctor2: C<A2, R2>, ctor3: C<A3, R3>
  ): new (...args: any) => R1 & R2 & R3
  <A1 extends any[], R1, A2 extends any[], R2,
    A3 extends any[], R3, A4 extends any[], R4>(
      ctor1: C<A1, R1>, ctor2: C<A2, R2>, ctor3: C<A3, R3>, ctor4: C<A4, R4>
    ): new (...args: any) => R1 & R2 & R3 & R4

  // fall back to variadic 
  <R extends any[]>(
    ...ctors: { [I in keyof R]: new (...args: any) => R[I] }
  ): new (...args: any) =>
      { [I in keyof R]: (x: R[I]) => void }[number] extends (
        x: infer I) => void ? I : never;
}

var Mixin:MixinFunction = function <R extends any[]>(
  ...ctors: { [I in keyof R]: new (...args: any) => R[I] }
): new (...args: any) =>
      { [I in keyof R]: (x: R[I]) => void }[number] extends (
        x: infer I) => void ? I : never {
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
  const MixinSuperClass: new (...args: any) =>
      { [I in keyof R]: (x: R[I]) => void }[number] extends (
        x: infer I) => void ? I : never = class {
    private supers: Record<string, Record<string, (...args: Array<Array<any>>) => any>> =
      {};
    
    constructor(args: Record<string, Array<unknown>>) {
      const prototype = Object.getPrototypeOf(this);
      const thisProps = Object.getOwnPropertyDescriptors(prototype);
      ctors.forEach((mixinMember, index) => {
        this.supers[mixinMember.name] = {};
        const mixinMemberInstance = applyToConstructor(
          mixinMember as C<any[], any>,
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
  } as new (...args: any) =>
      { [I in keyof R]: (x: R[I]) => void }[number] extends (
        x: infer I) => void ? I : never;

  ctors.forEach((Mixin) => {
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
} as MixinFunction;

export { Mixin };
