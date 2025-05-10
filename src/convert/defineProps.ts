import * as t from '@babel/types';
import { extractSetupParams, getProperty, getSetup } from './utils';
import traverse from '@babel/traverse';
import { ParseResult } from '@babel/parser';

interface ConvertResult {
	name: string;
	signature: t.TSPropertySignature;
	default: t.Expression;
}

const createSignature = (name: string, type: t.TSType, optional = false) => {
	const signature = t.tsPropertySignature(t.identifier(name), t.tsTypeAnnotation(type));
	signature.optional = optional;
	return signature;
};

const convertIdentifier = (identifier: t.Identifier) => {
	const name = identifier.name;
	if (name === 'Boolean') {
		return t.tsBooleanKeyword();
	}

	if (name === 'String') {
		return t.tsStringKeyword();
	}

	if (name === 'Object') {
		return t.tsObjectKeyword();
	}

	if (name === 'Number') {
		return t.tsNumberKeyword();
	}

	return t.tsTypeReference(t.identifier(name));
};

const transformArrayExp = (arr: t.ArrayExpression, name: string) => {
	const tsTypes: t.TSType[] = [];
	for (const of of arr.elements) {
		if (t.isIdentifier(of)) {
			tsTypes.push(convertIdentifier(of));
		}
	}
	return createSignature(name, t.tsUnionType(tsTypes));
};

const convertProp = (prop: t.ObjectProperty) => {
	if (!t.isObjectProperty(prop) || !t.isIdentifier(prop.key)) {
		return null;
	}

	const name = prop.key.name;

	const result: ConvertResult = {
		name,
		signature: null,
		default: null,
	};

	// model: Boolean
	if (t.isIdentifier(prop.value)) {
		result.signature = createSignature(name, convertIdentifier(prop.value));
		return result;
	}

	// model: [String, Number]
	if (t.isArrayExpression(prop.value)) {
		result.signature = transformArrayExp(prop.value, name);
		return result;
	}

	let isOptional = true;

	if (!t.isObjectExpression(prop.value)) {
		return result;
	}

	// model: { type: Boolean, default: false }
	for (const property of prop.value.properties) {
		if (!t.isObjectProperty(property) || !t.isIdentifier(property.key)) {
			continue;
		}

		const nameProperty = property.key.name;

		if (nameProperty === 'type') {
			// model: { type: Boolean,
			if (t.isIdentifier(property.value)) {
				result.signature = createSignature(name, convertIdentifier(property.value));
			}
			// type: String as PropType<'light' | 'black'>,
			if (t.isTSAsExpression(property.value)) {
				// type: String as PropType<
				if (t.isTSTypeReference(property.value.typeAnnotation)) {
					const params = property.value.typeAnnotation.typeParameters.params;
					result.signature = createSignature(name, params[0]);
				}
			}

			// model: { type: [String, Number], default: false }
			if (t.isArrayExpression(property.value)) {
				result.signature = transformArrayExp(property.value, name);
			}
		}

		if (nameProperty === 'required') {
			isOptional = (property.value as t.BooleanLiteral).value === false;
		}
		if (nameProperty === 'default') {
			result.default = property.value as t.Expression;
		}
	}

	if (isOptional && result.signature) {
		result.signature.optional = true;
	}

	return result;
};

export const getDefinePropsWithSignature = (path: t.ObjectExpression) => {
	if (!t.isObjectExpression(path)) {
		return null;
	}

	const signature: t.TSPropertySignature[] = [];
	const defaults: Map<string, t.Expression> = new Map();
	const otherProperties: t.ObjectProperty[] = [];

	for (const prop of path.properties) {
		const result = convertProp(prop as t.ObjectProperty);
		if (result?.signature) {
			signature.push(result.signature);
		}
		if (result?.default) {
			defaults.set(result.name, result.default);
		} else {
			otherProperties.push(t.objectProperty(t.identifier(result.name), t.identifier(result.name), false, true));
		}
	}

	const defineProps = t.callExpression(t.identifier('defineProps'), []);
	defineProps.typeParameters = t.tsTypeParameterInstantiation([t.tsTypeLiteral(signature)]);

	const properties: t.ObjectProperty[] = [];
	[...defaults.entries()].forEach(([name, value]) => {
		properties.push(t.objectProperty(t.identifier(name), value));
	});

	if (defaults.size === 0 && otherProperties.length === 0) {
		return { defineProps, properties: [], otherProperties: [] };
	}

	return {
		defineProps,
		properties,
		otherProperties,
	};
};

export const getDefinePropsFromObjectExpression = (path: t.ObjectExpression) => {
	if (!t.isObjectExpression(path)) {
		return null;
	}

	const { defineProps, properties } = getDefinePropsWithSignature(path);

	if (properties.length === 0) {
		return defineProps;
	}

	const expression = t.objectExpression(properties);
	return t.callExpression(t.identifier('withDefaults'), [defineProps, expression]);
};

export const getDefinePropsTypeLiteration = (path: t.ObjectExpression) => {
	const properties = path.properties;

	const propsProperty = getProperty(properties, 'props');

	if (!propsProperty) {
		return null;
	}

	const defineProps = getDefinePropsFromObjectExpression(propsProperty.value as t.ObjectExpression);

	const setup = getSetup(properties);
	if (!setup) {
		return t.expressionStatement(defineProps);
	}

	const { props } = extractSetupParams(setup);
	if (props) {
		return t.variableDeclaration('const', [t.variableDeclarator(t.identifier('props'), defineProps)]);
	}

	return t.expressionStatement(defineProps);
};

export const getDefineProps = (path: t.ObjectExpression) => {
	const properties = path.properties;

	const propsProperty = getProperty(properties, 'props');

	if (!propsProperty) {
		return null;
	}

	const callExpression = t.callExpression(t.identifier('defineProps'), [propsProperty.value as t.Expression]);
	const setup = getSetup(properties);
	if (!setup) {
		return t.expressionStatement(callExpression);
	}

	const { props } = extractSetupParams(setup);
	if (props) {
		return t.variableDeclaration('const', [t.variableDeclarator(t.identifier('props'), callExpression)]);
	}

	return t.expressionStatement(callExpression);
};

// convertObjectProperty to assignmentPattern
// convertObjectProperty(property: t.ObjectProperty) => t.ObjectProperty
export const convertObjectProperty = (property: t.ObjectProperty) => {
	return t.objectProperty(
		property.key,
		t.assignmentPattern(property.key as t.Identifier, property.value as t.Expression),
	);
};

export const createObjectPattern = (properties: t.ObjectProperty[], defineProps: t.CallExpression) => {
	const pattern = t.variableDeclarator(t.objectPattern([...properties]), defineProps);
	return t.variableDeclaration('const', [pattern]);
};

export const convertObjectPattern = (defineProps: t.CallExpression, properties: t.ObjectProperty[]) => {
	return createObjectPattern(properties.map(convertObjectProperty), defineProps);
};

export const getReactivityProps = (path: t.ObjectExpression) => {
	const propsProperty = getProperty(path.properties, 'props');

	if (!propsProperty) {
		return null;
	}

	const { defineProps, properties, otherProperties } = getDefinePropsWithSignature(
		propsProperty.value as t.ObjectExpression,
	);

	const assigments = properties.map(convertObjectProperty);
	return createObjectPattern([...assigments, ...otherProperties], defineProps);
};

export const replacePropsMemberExpression = (ast: ParseResult<t.File>) => {
	traverse(ast, {
		MemberExpression(path) {
			if (t.isIdentifier(path.node.object) && path.node.object.name === 'props') {
				path.replaceWith(path.node.property);
			}
		},
	});
};
