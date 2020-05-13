import { getPropDescriptors } from './util/objects';

function isProtectedProp(prop) {
  return prop.substring(0, 2) === '$_';
}

function trimProp(prop) {
  return prop.substring(2);
}

function validatePropDescriptors(props) {
  props.some(([prop, desc]) => {
    if (!desc.configurable) {
      throw new Error(
        `Prop ${prop} specified as protected, however it is not configurable -- can't be removed from class!`
      );
    }
  });
}

export function findProtectedProps(obj) {
  const protectedProps = {};

  for (let prop in obj) {
    if (isProtectedProp(prop)) {
      protectedProps[trimProp(prop)] = obj[prop];
    }
  }

  return protectedProps;
}

// ! WARNING this is a by-reference procedure and will affect the passed object
export function extractProtectedProps(obj, exclude) {
  // find and filter out protected instance props
  const props = getPropDescriptors(obj, exclude);
  const protectedProps = findProtectedProps(props);
  validatePropDescriptors(protectedProps);

  // if validation passes, go ahead and remove the props from the original object
  protectedProps.forEach(([prop]) => {
    delete obj[prop];
  });

  return protectedProps;
}
