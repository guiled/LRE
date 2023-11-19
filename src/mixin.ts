// Thanks to https://github.com/jcalz  https://stackoverflow.com/a/76585028/762461
type C<A extends any[], R> = abstract new (...args: A) => R;

type MixinFunction = {
  <A1 extends any[], R1>(ctor1: C<A1, R1>): new (...args: any) => R1;
  <A1 extends any[], R1, A2 extends any[], R2>(
    ctor1: C<A1, R1>,
    ctor2: C<A2, R2>
  ): new (...args: any) => R1 & R2;
  <A1 extends any[], R1, A2 extends any[], R2, A3 extends any[], R3>(
    ctor1: C<A1, R1>,
    ctor2: C<A2, R2>,
    ctor3: C<A3, R3>
  ): new (...args: any) => R1 & R2 & R3;
  <
    A1 extends any[],
    R1,
    A2 extends any[],
    R2,
    A3 extends any[],
    R3,
    A4 extends any[],
    R4
  >(
    ctor1: C<A1, R1>,
    ctor2: C<A2, R2>,
    ctor3: C<A3, R3>,
    ctor4: C<A4, R4>
  ): new (...args: any) => R1 & R2 & R3 & R4;

  // fall back to variadic
  <R extends any[]>(
    ...ctors: { [I in keyof R]: new (...args: any) => R[I] }
  ): new (...args: any) => {
    [I in keyof R]: (x: R[I]) => void;
  }[number] extends (x: infer I) => void
    ? I
    : never;
};

type ObjectProp = {key: PropertyKey, descriptor: PropertyDescriptor}

const getProps = (() => {
  const getPropsMemo = new WeakMap();
  return (obj: any): Array<ObjectProp> => {
    if (!getPropsMemo.has(obj)) {
      const properties: Record<PropertyKey, PropertyDescriptor> = {};
      let currentObj = obj;
      const prototypes = [];
      do {
        prototypes.unshift(currentObj);
      } while (
        (currentObj = Object.getPrototypeOf(currentObj)) &&
        currentObj.constructor.name !== "Object"
      );
      prototypes.forEach((prototype) => {
        Object.assign(properties, Object.getOwnPropertyDescriptors(prototype));
      });
    
      getPropsMemo.set(obj, Object.keys(properties).filter(p => p !== 'constructor').map(p => ({
        key: p,
        descriptor: properties[p],
      })));
    }
    return getPropsMemo.get(obj);
  };
})();

const methodChanged = (method: PropertyKey, instance: any, mixinClass: any) => {
  return instance[method] !== mixinClass.prototype[method];
};

enum MixinPropType {
  METHOD,
  GETTER_SETTER,
}

type MixinProperty = {
  mixinIndex: number;
  type: MixinPropType;
  descriptor: PropertyDescriptor;
};

var _Mixin: MixinFunction = function <R extends any[]>(
  ...mixinMembers: { [I in keyof R]: new (...args: any) => R[I] }
): new (...args: any) => { [I in keyof R]: (x: R[I]) => void }[number] extends (
  x: infer I
) => void
  ? I
  : never {
  const _mixinProps: Record<PropertyKey, MixinProperty> = {};

  const MixinSuperClass: new (...args: any) => {
    [I in keyof R]: (x: R[I]) => void;
  }[number] extends (x: infer I) => void
    ? I
    : never = class {
    protected readonly instances: Array<any> = [];
    constructor(args: Array<Array<unknown>>) {
      const thisProps = getProps(this);
      const mixinProps: Record<PropertyKey, MixinProperty> = {
        ..._mixinProps,
      };

      thisProps.forEach((prop) => {
        if (mixinProps[prop.key]?.type === MixinPropType.METHOD && methodChanged(prop.key, this, MixinSuperClass)) {
          mixinProps[prop.key] = {
            mixinIndex: -1,
            type: _mixinProps[prop.key].type,
            descriptor: prop.descriptor,
          };
        }
      });

      mixinMembers.forEach((member, memberIndex) => {
        const instance = new member(...(args?.[memberIndex] || []));
        this.instances.push(instance);

        const descriptors: PropertyDescriptorMap = {};
        Object.keys(mixinProps).forEach(p => {
           const prop = mixinProps[p];
           if (prop.mixinIndex === memberIndex) return;
           if (prop.type === MixinPropType.GETTER_SETTER) {
             descriptors[p] = {
              ...prop.descriptor,
              get: prop.descriptor.get?.bind?.(this),
              set: prop.descriptor.set?.bind?.(this),
            };
           } else {
            descriptors[p] = {
               ...prop.descriptor,
               value: prop.descriptor.value?.bind(this),
             };
           }
        });
        Object.defineProperties(instance, descriptors);
      });
      this.instances.forEach((instance) => {
        const instanceProps = getProps(instance);
        instanceProps.forEach(prop => {
          if (!thisProps.some(p => p.key === prop.key)) {
            Object.defineProperty(this, prop.key, prop.descriptor);
          }
        });
      })
    }
  } as new (...args: any) => {
    [I in keyof R]: (x: R[I]) => void;
  }[number] extends (x: infer I) => void
    ? I
    : never;

  // Define all properties for the class, to be called with super.prop
  (() => {
    const properties: PropertyDescriptorMap = {};
    mixinMembers.forEach((member, memberIndex) => {
      const props = getProps(member.prototype);
      props.forEach((p: ObjectProp) => {
        const type = p.descriptor.get
          ? MixinPropType.GETTER_SETTER
          : MixinPropType.METHOD;

        let descriptor: PropertyDescriptor;
        let index = memberIndex;

        if (type === MixinPropType.GETTER_SETTER) {
          let getter = p.descriptor.get as (...args: any[]) => any;
          let setter = p.descriptor.set as (...args: any[]) => any;
          descriptor = {
            ...p.descriptor,
            get: function (...args: any[]) {
              /* @ts-ignore this.instances WILL BE defined in the instance */
              return getter.apply(this.instances[index], args);
            },
            set: function (...args: any[]) {
              /* @ts-ignore this.instances WILL BE defined in the instance */
              return setter.apply(this.instances[index], args);
            },
          };
        } else {
          let cb = p.descriptor.value as (...args: any[]) => any;
          descriptor = {
            ...p.descriptor,
            value: function (...args: any[]) {
              /* @ts-ignore this.instances WILL BE defined in the instance */
              return cb.apply(this.instances[index], args);
            },
          };
        }
        _mixinProps[p.key] = {
          mixinIndex: memberIndex,
          type,
          descriptor,
        };
        properties[p.key] = descriptor;
      });
    });
    Object.defineProperties(MixinSuperClass.prototype, properties);
  })();

  return MixinSuperClass;
} as MixinFunction;

export { _Mixin as Mixin };
